import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { GetTransactionsQueryParams, GetTransactionSummaryQueryParams } from "@workspace/api-zod";
import { eq, and, sql, desc, count, inArray } from "drizzle-orm";
import { walletsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/transactions", async (req, res) => {
  const query = GetTransactionsQueryParams.parse(req.query);
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to view transactions." });
    return;
  }

  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;

  const ownedWallets = await db.select({
    walletAddress: walletsTable.walletAddress,
    network: walletsTable.network,
  }).from(walletsTable).where(eq(walletsTable.userId, userId));
  const requestedAddress = query.walletAddress?.toLowerCase();
  const visibleAddresses = ownedWallets
    .filter((wallet) => !query.network || wallet.network === query.network)
    .filter((wallet) => !query.walletAddress || (
      wallet.walletAddress === (wallet.network === "ethereum" || wallet.network === "bnb"
        ? requestedAddress
        : query.walletAddress)
    ))
    .map((wallet) => wallet.walletAddress);

  if (query.walletAddress && visibleAddresses.length === 0) {
    res.status(404).json({ error: "Wallet not found on this account." });
    return;
  }
  if (visibleAddresses.length === 0) {
    res.json({ transactions: [], total: 0 });
    return;
  }

  const conditions = [];
  conditions.push(inArray(transactionsTable.walletAddress, visibleAddresses));
  if (query.network) {
    conditions.push(eq(transactionsTable.network, query.network));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(transactionsTable)
      .where(whereClause)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(transactionsTable)
      .where(whereClause),
  ]);

  res.json({
    transactions: rows.map(formatTx),
    total: totalRows[0].count,
  });
});

router.get("/transactions/summary", async (req, res) => {
  const query = GetTransactionSummaryQueryParams.parse(req.query);
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to view the transaction summary." });
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
    res.status(404).json({ error: "Wallet not found on this account." });
    return;
  }

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.walletAddress, walletAddress),
        eq(transactionsTable.network, query.network),
      ),
    );

  let totalReceived = 0;
  let totalSent = 0;
  let totalFaucetClaimed = 0;
  let totalToppedUp = 0;
  let usdtzSimBalance = 0;
  let usdtSimBalance = 0;

  for (const tx of rows) {
    const amt = parseFloat(tx.amount ?? "0");
    if (tx.type === "faucet") {
      totalFaucetClaimed += amt;
      if (tx.tokenType === "USDtz-SIM") usdtzSimBalance += amt;
      else usdtSimBalance += amt;
    } else if (tx.type === "transfer_in") {
      totalReceived += amt;
      if (tx.tokenType === "USDtz-SIM") usdtzSimBalance += amt;
      else usdtSimBalance += amt;
    } else if (tx.type === "transfer_out") {
      totalSent += amt;
      if (tx.tokenType === "USDtz-SIM") usdtzSimBalance -= amt;
      else usdtSimBalance -= amt;
    } else if (tx.type === "topup") {
      totalToppedUp += amt;
      if (tx.tokenType === "USDtz-SIM") usdtzSimBalance += amt;
      else usdtSimBalance += amt;
    }
  }

  res.json({
    totalReceived,
    totalSent,
    totalFaucetClaimed,
    totalToppedUp,
    transactionCount: rows.length,
    usdtzSimBalance: Math.max(0, usdtzSimBalance),
    usdtSimBalance: Math.max(0, usdtSimBalance),
  });
});

function formatTx(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id,
    txHash: tx.txHash,
    type: tx.type,
    walletAddress: tx.walletAddress,
    counterpartyAddress: tx.counterpartyAddress ?? null,
    network: tx.network,
    tokenType: tx.tokenType,
    amount: parseFloat(tx.amount ?? "0"),
    createdAt: tx.createdAt.toISOString(),
  };
}

export default router;
