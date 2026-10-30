import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import { authSessionsTable, usersTable } from "@workspace/db/schema";
import { createHash } from "node:crypto";

export const SESSION_COOKIE = "dev_wallet_session";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function loadAuthUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length < 40 || token.length > 200) {
    next();
    return;
  }

  const [session] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      phone: usersTable.phone,
      isAdmin: usersTable.isAdmin,
    })
    .from(authSessionsTable)
    .innerJoin(usersTable, eq(authSessionsTable.userId, usersTable.id))
    .where(and(
      eq(authSessionsTable.tokenHash, hashSessionToken(token)),
      gt(authSessionsTable.expiresAt, new Date()),
    ))
    .limit(1);

  if (session) req.authUser = session;
  else res.clearCookie(SESSION_COOKIE, cookieOptions(req));
  next();
}

export function cookieOptions(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  if (!req.authUser.isAdmin) {
    res.status(403).json({ error: "This account does not have admin access." });
    return;
  }
  next();
}
