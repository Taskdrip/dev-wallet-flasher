import { Router, type IRouter } from "express";
import { eq, lt, or } from "drizzle-orm";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { authSessionsTable, usersTable } from "@workspace/db/schema";
import { z } from "zod/v4";
import { cookieOptions, hashSessionToken, SESSION_COOKIE } from "../middlewares/authMiddleware";

const router: IRouter = Router();
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

const signupSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, numbers, dots, underscores, or hyphens."),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.union([z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use international format, such as +14155552671."), z.literal("")]).optional(),
  password: z.string().min(10, "Password must be at least 10 characters.").max(128),
});

const signinSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

function normalizeEmail(email: string | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value || null;
}

function normalizePhone(phone: string | undefined): string | null {
  const value = phone?.trim();
  return value || null;
}

function passwordKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await passwordKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, savedHash: string): Promise<boolean> {
  const [salt, keyHex] = savedHash.split(":");
  if (!salt || !keyHex || !/^[a-f0-9]{128}$/i.test(keyHex)) return false;
  const actual = await passwordKey(password, salt);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function publicUser(user: { id: number; username: string; email: string | null; phone: string | null }) {
  return { id: user.id, username: user.username, email: user.email, phone: user.phone };
}

async function createSession(userId: number, req: Request, res: Response): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(authSessionsTable).values({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(req),
    maxAge: SESSION_DURATION_MS,
  });
  // Periodically remove old session rows without requiring a background worker.
  await db.delete(authSessionsTable).where(lt(authSessionsTable.expiresAt, new Date()));
}

function authRateLimitKey(req: Request, identifier: string): string {
  return `${req.ip || "unknown"}:${identifier.toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_AUTH_ATTEMPTS;
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check the signup details." });
    return;
  }

  const username = parsed.data.username.toLowerCase();
  const email = normalizeEmail(parsed.data.email);
  const phone = normalizePhone(parsed.data.phone);
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const [user] = await db.insert(usersTable).values({
      username,
      email,
      phone,
      passwordHash,
    }).returning({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      phone: usersTable.phone,
    });

    await createSession(user.id, req, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      res.status(409).json({ error: "That username, email, or phone number is already registered." });
      return;
    }
    throw error;
  }
});

router.post("/auth/signin", async (req, res): Promise<void> => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Enter your account and password." });
    return;
  }

  const identifier = parsed.data.identifier.trim();
  const normalized = identifier.toLowerCase();
  const key = authRateLimitKey(req, identifier);
  if (isRateLimited(key)) {
    res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(
      eq(usersTable.username, normalized),
      eq(usersTable.email, normalized),
      eq(usersTable.phone, identifier),
    ))
    .limit(1);

  // Perform a password hash even for unknown identifiers to reduce account-enumeration timing differences.
  const passwordOk = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await passwordKey(parsed.data.password, "00000000000000000000000000000000").then(() => false);

  if (!user || !passwordOk) {
    res.status(401).json({ error: "The account or password is incorrect." });
    return;
  }

  attempts.delete(key);
  await createSession(user.id, req, res);
  res.json({ user: publicUser(user) });
});

router.get("/auth/me", (req, res): void => {
  if (!req.authUser) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  res.json({ user: publicUser(req.authUser) });
});

router.post("/auth/signout", async (req, res): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string") {
    await db.delete(authSessionsTable).where(eq(authSessionsTable.tokenHash, hashSessionToken(token)));
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions(req));
  res.json({ success: true });
});

export default router;
