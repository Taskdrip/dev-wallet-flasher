import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable, faucetClaimsTable, transactionsTable, faucetConfigTable } from "@workspace/db/schema";
import { ClaimFaucetBody, GetFaucetStatusQueryParams } from "@workspace/api-zod";
import { eq, and, gte, sql } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const configs = await db.select().from(faucetConfigTable).limit(1);
  if (configs.length > 0) return configs[0];

  const inserted = await db
    .insert(faucetConfigTable)
    .values({})
    .returning();
  return inserted[0];
}

router.post("/faucet/claim", async (req, res) => {
  const parsedBody = ClaimFaucetBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.issues[0]?.message ?? "Invalid faucet request." });
    return;
  }
  const body = parsedBody.data;
  if ((body.network === "tezos") !== (body.tokenType === "USDtz-SIM")) {
    res.status(400).json({ error: "USDtz-SIM is only available on Tezos; use USDT-SIM on Ethereum, BNB, or Tron." });
    return;
  }

  const config = await getOrCreateConfig();
  const dailyLimit =
    body.network === "tezos"
      ? parseFloat(config.tezosUsdtzSimDailyLimit ?? "1000")
      : parseFloat(config.ethereumUsdtSimDailyLimit ?? "1000");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const walletAddress = body.network === "ethereum" || body.network === "bnb"
    ? body.walletAddress.toLowerCase()
    : body.walletAddress;
  const txHash = `SIM-${crypto.randomUUID()}`;
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to claim test tokens." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const wallet = await tx.select().from(walletsTable).where(and(
      eq(walletsTable.walletAddress, walletAddress),
      eq(walletsTable.network, body.network),
      eq(walletsTable.userId, userId),
    )).limit(1).for("update");
    if (wallet.length === 0) return { error: "Connect this wallet before claiming test tokens.", status: 404 as const };
    if (wallet[0].isFrozen) return { error: "Wallet is frozen and cannot claim tokens.", status: 400 as const };

    const todayClaims = await tx
      .select({ total: sql<string>`COALESCE(SUM(${faucetClaimsTable.amount}), 0)` })
      .from(faucetClaimsTable)
      .where(and(
        eq(faucetClaimsTable.walletAddress, walletAddress),
        eq(faucetClaimsTable.network, body.network),
        eq(faucetClaimsTable.tokenType, body.tokenType),
        gte(faucetClaimsTable.claimedAt, startOfDay),
      ));
    const claimedToday = parseFloat(todayClaims[0]?.total ?? "0");
    if (claimedToday >= dailyLimit) return { error: `Daily faucet limit of ${dailyLimit} reached.`, status: 429 as const };

    const claimAmount = Math.min(100, dailyLimit - claimedToday);
    await tx.insert(faucetClaimsTable).values({
      walletAddress,
      network: body.network,
      tokenType: body.tokenType,
      amount: claimAmount.toString(),
    });
    await tx.insert(transactionsTable).values({
      txHash,
      type: "faucet",
      walletAddress,
      network: body.network,
      tokenType: body.tokenType,
      amount: claimAmount.toString(),
    });
    if (body.tokenType === "USDtz-SIM") {
      await tx.update(walletsTable).set({
        usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${claimAmount}`,
        lastSeenAt: new Date(),
      }).where(eq(walletsTable.id, wallet[0].id));
    } else {
      await tx.update(walletsTable).set({
        usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${claimAmount}`,
        lastSeenAt: new Date(),
      }).where(eq(walletsTable.id, wallet[0].id));
    }
    return { claimAmount, claimedToday };
  });

  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }

  const claimAmount = result.claimAmount;
  const claimedToday = result.claimedToday;

  const remaining = dailyLimit - claimedToday - claimAmount;

  res.json({
    success: true,
    amount: claimAmount,
    tokenType: body.tokenType,
    txHash,
    remainingDaily: Math.max(0, remaining),
    message: `Successfully claimed ${claimAmount} ${body.tokenType}`,
  });
});

router.get("/faucet/status", async (req, res) => {
  const query = GetFaucetStatusQueryParams.parse(req.query);
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to check faucet status." });
    return;
  }
  const walletAddress = query.network === "ethereum" || query.network === "bnb"
    ? query.walletAddress.toLowerCase()
    : query.walletAddress;
  const wallet = await db.select({ id: walletsTable.id }).from(walletsTable).where(and(
    eq(walletsTable.walletAddress, walletAddress),
    eq(walletsTable.network, query.network),
    eq(walletsTable.userId, userId),
  )).limit(1);
  if (wallet.length === 0) {
    res.status(404).json({ error: "Wallet not found. Connect it first." });
    return;
  }
  const config = await getOrCreateConfig();

  const dailyLimit =
    query.network === "tezos"
      ? parseFloat(config.tezosUsdtzSimDailyLimit ?? "1000")
      : parseFloat(config.ethereumUsdtSimDailyLimit ?? "1000");

  const tokenType = query.network === "tezos" ? "USDtz-SIM" : "USDT-SIM";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayClaims = await db
    .select({ total: sql<string>`COALESCE(SUM(${faucetClaimsTable.amount}), 0)` })
    .from(faucetClaimsTable)
    .where(
      and(
        eq(faucetClaimsTable.walletAddress, walletAddress),
        eq(faucetClaimsTable.network, query.network),
        eq(faucetClaimsTable.tokenType, tokenType),
        gte(faucetClaimsTable.claimedAt, startOfDay),
      ),
    );

  const claimedToday = parseFloat(todayClaims[0]?.total ?? "0");
  const canClaim = claimedToday < dailyLimit;

  let nextClaimAt: string | null = null;
  if (!canClaim) {
    const tomorrow = new Date(startOfDay);
    tomorrow.setDate(tomorrow.getDate() + 1);
    nextClaimAt = tomorrow.toISOString();
  }

  res.json({
    walletAddress,
    network: query.network,
    claimedToday,
    dailyLimit,
    canClaim,
    nextClaimAt,
  });
});

export default router;
