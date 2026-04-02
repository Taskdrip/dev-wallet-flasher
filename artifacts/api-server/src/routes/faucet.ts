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
  const body = ClaimFaucetBody.parse(req.body);

  const wallet = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.walletAddress, body.walletAddress),
        eq(walletsTable.network, body.network),
      ),
    )
    .limit(1);

  if (wallet.length > 0 && wallet[0].isFrozen) {
    res.status(400).json({ error: "Wallet is frozen and cannot claim tokens" });
    return;
  }

  const config = await getOrCreateConfig();
  const dailyLimit =
    body.network === "tezos"
      ? parseFloat(config.tezosUsdtzSimDailyLimit ?? "1000")
      : parseFloat(config.ethereumUsdtSimDailyLimit ?? "1000");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayClaims = await db
    .select({ total: sql<string>`COALESCE(SUM(${faucetClaimsTable.amount}), 0)` })
    .from(faucetClaimsTable)
    .where(
      and(
        eq(faucetClaimsTable.walletAddress, body.walletAddress),
        eq(faucetClaimsTable.network, body.network),
        eq(faucetClaimsTable.tokenType, body.tokenType),
        gte(faucetClaimsTable.claimedAt, startOfDay),
      ),
    );

  const claimedToday = parseFloat(todayClaims[0]?.total ?? "0");

  if (claimedToday >= dailyLimit) {
    const tomorrow = new Date(startOfDay);
    tomorrow.setDate(tomorrow.getDate() + 1);
    res.status(429).json({ error: `Daily faucet limit of ${dailyLimit} reached. Try again after ${tomorrow.toISOString()}` });
    return;
  }

  const claimAmount = Math.min(100, dailyLimit - claimedToday);
  const txHash = "0x" + crypto.randomBytes(32).toString("hex");

  await db.insert(faucetClaimsTable).values({
    walletAddress: body.walletAddress,
    network: body.network,
    tokenType: body.tokenType,
    amount: claimAmount.toString(),
  });

  const txType = "faucet";
  await db.insert(transactionsTable).values({
    txHash,
    type: txType,
    walletAddress: body.walletAddress,
    network: body.network,
    tokenType: body.tokenType,
    amount: claimAmount.toString(),
  });

  if (wallet.length > 0) {
    if (body.tokenType === "USDtz-SIM") {
      await db
        .update(walletsTable)
        .set({
          usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${claimAmount}`,
          lastSeenAt: new Date(),
        })
        .where(eq(walletsTable.id, wallet[0].id));
    } else {
      await db
        .update(walletsTable)
        .set({
          usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${claimAmount}`,
          lastSeenAt: new Date(),
        })
        .where(eq(walletsTable.id, wallet[0].id));
    }
  }

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
        eq(faucetClaimsTable.walletAddress, query.walletAddress),
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
    walletAddress: query.walletAddress,
    network: query.network,
    claimedToday,
    dailyLimit,
    canClaim,
    nextClaimAt,
  });
});

export default router;
