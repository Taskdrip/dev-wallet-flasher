import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable, faucetClaimsTable, faucetConfigTable } from "@workspace/db/schema";
import { GetAdminWalletsQueryParams, FreezeWalletParams, FreezeWalletBody, UpdateFaucetLimitsBody } from "@workspace/api-zod";
import { eq, sql, count, gte, desc } from "drizzle-orm";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const configs = await db.select().from(faucetConfigTable).limit(1);
  if (configs.length > 0) return configs[0];
  const inserted = await db.insert(faucetConfigTable).values({}).returning();
  return inserted[0];
}

router.get("/admin/stats", async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    walletStats,
    txCount,
    frozenCount,
    todayClaims,
    usdtzDist,
    usdtDist,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        tezos: sql<number>`COUNT(*) FILTER (WHERE ${walletsTable.network} = 'tezos')`,
        ethereum: sql<number>`COUNT(*) FILTER (WHERE ${walletsTable.network} = 'ethereum')`,
      })
      .from(walletsTable),
    db.select({ count: count() }).from(transactionsTable),
    db
      .select({ count: count() })
      .from(walletsTable)
      .where(eq(walletsTable.isFrozen, true)),
    db
      .select({ count: count() })
      .from(faucetClaimsTable)
      .where(gte(faucetClaimsTable.claimedAt, startOfDay)),
    db
      .select({ total: sql<string>`COALESCE(SUM(${faucetClaimsTable.amount}), 0)` })
      .from(faucetClaimsTable)
      .where(eq(faucetClaimsTable.tokenType, "USDtz-SIM")),
    db
      .select({ total: sql<string>`COALESCE(SUM(${faucetClaimsTable.amount}), 0)` })
      .from(faucetClaimsTable)
      .where(eq(faucetClaimsTable.tokenType, "USDT-SIM")),
  ]);

  res.json({
    totalWallets: walletStats[0].total,
    totalTezosWallets: Number(walletStats[0].tezos),
    totalEthereumWallets: Number(walletStats[0].ethereum),
    totalUsdtzSimDistributed: parseFloat(usdtzDist[0].total),
    totalUsdtSimDistributed: parseFloat(usdtDist[0].total),
    totalTransactions: txCount[0].count,
    frozenWallets: frozenCount[0].count,
    todaysClaims: todayClaims[0].count,
  });
});

router.get("/admin/wallets", async (req, res) => {
  const query = GetAdminWalletsQueryParams.parse(req.query);
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const [wallets, totalRows] = await Promise.all([
    db
      .select()
      .from(walletsTable)
      .orderBy(desc(walletsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(walletsTable),
  ]);

  res.json({
    wallets: wallets.map(formatWallet),
    total: totalRows[0].count,
  });
});

router.post("/admin/wallets/:walletAddress/freeze", async (req, res) => {
  const params = FreezeWalletParams.parse(req.params);
  const body = FreezeWalletBody.parse(req.body);

  const updated = await db
    .update(walletsTable)
    .set({ isFrozen: body.frozen })
    .where(eq(walletsTable.walletAddress, params.walletAddress))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.json(formatWallet(updated[0]));
});

router.get("/admin/faucet-limits", async (_req, res) => {
  const config = await getOrCreateConfig();
  res.json(formatConfig(config));
});

router.put("/admin/faucet-limits", async (req, res) => {
  const body = UpdateFaucetLimitsBody.parse(req.body);
  const config = await getOrCreateConfig();

  const updated = await db
    .update(faucetConfigTable)
    .set({
      tezosUsdtzSimDailyLimit: body.tezosUsdtzSimDailyLimit.toString(),
      ethereumUsdtSimDailyLimit: body.ethereumUsdtSimDailyLimit.toString(),
      updatedAt: new Date(),
    })
    .where(eq(faucetConfigTable.id, config.id))
    .returning();

  res.json(formatConfig(updated[0]));
});

function formatWallet(w: typeof walletsTable.$inferSelect) {
  return {
    id: w.id,
    walletAddress: w.walletAddress,
    network: w.network,
    walletType: w.walletType,
    usdtzSimBalance: parseFloat(w.usdtzSimBalance ?? "0"),
    usdtSimBalance: parseFloat(w.usdtSimBalance ?? "0"),
    isFrozen: w.isFrozen,
    createdAt: w.createdAt.toISOString(),
    lastSeenAt: w.lastSeenAt.toISOString(),
  };
}

function formatConfig(c: typeof faucetConfigTable.$inferSelect) {
  return {
    tezosUsdtzSimDailyLimit: parseFloat(c.tezosUsdtzSimDailyLimit ?? "1000"),
    ethereumUsdtSimDailyLimit: parseFloat(c.ethereumUsdtSimDailyLimit ?? "1000"),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
