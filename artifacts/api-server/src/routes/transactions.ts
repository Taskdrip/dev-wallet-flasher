import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { GetTransactionsQueryParams, GetTransactionSummaryQueryParams } from "@workspace/api-zod";
import { eq, and, sql, desc, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/transactions", async (req, res) => {
  const query = GetTransactionsQueryParams.parse(req.query);

  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;

  const conditions = [];
  if (query.walletAddress) {
    conditions.push(eq(transactionsTable.walletAddress, query.walletAddress));
  }
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

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.walletAddress, query.walletAddress),
        eq(transactionsTable.network, query.network),
      ),
    );

  let totalReceived = 0;
  let totalSent = 0;
  let totalFaucetClaimed = 0;
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
    }
  }

  res.json({
    totalReceived,
    totalSent,
    totalFaucetClaimed,
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
