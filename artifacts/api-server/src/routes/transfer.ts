import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable } from "@workspace/db/schema";
import { TransferTokensBody } from "@workspace/api-zod";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/transfer", async (req, res) => {
  const body = TransferTokensBody.parse(req.body);

  const sender = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.walletAddress, body.fromAddress),
        eq(walletsTable.network, body.network),
      ),
    )
    .limit(1);

  if (sender.length === 0) {
    res.status(400).json({ error: "Sender wallet not found. Please register first." });
    return;
  }

  if (sender[0].isFrozen) {
    res.status(400).json({ error: "Sender wallet is frozen and cannot transfer tokens" });
    return;
  }

  const balanceField = body.tokenType === "USDtz-SIM" ? "usdtzSimBalance" : "usdtSimBalance";
  const senderBalance = parseFloat(sender[0][balanceField] ?? "0");

  if (senderBalance < body.amount) {
    res.status(400).json({ error: `Insufficient ${body.tokenType} balance. Have ${senderBalance}, need ${body.amount}` });
    return;
  }

  const receiver = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.walletAddress, body.toAddress),
        eq(walletsTable.network, body.network),
      ),
    )
    .limit(1);

  const txHash = "0x" + crypto.randomBytes(32).toString("hex");

  if (body.tokenType === "USDtz-SIM") {
    await db
      .update(walletsTable)
      .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} - ${body.amount}` })
      .where(eq(walletsTable.id, sender[0].id));

    if (receiver.length > 0) {
      await db
        .update(walletsTable)
        .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${body.amount}` })
        .where(eq(walletsTable.id, receiver[0].id));
    }
  } else {
    await db
      .update(walletsTable)
      .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} - ${body.amount}` })
      .where(eq(walletsTable.id, sender[0].id));

    if (receiver.length > 0) {
      await db
        .update(walletsTable)
        .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${body.amount}` })
        .where(eq(walletsTable.id, receiver[0].id));
    }
  }

  await db.insert(transactionsTable).values([
    {
      txHash,
      type: "transfer_out",
      walletAddress: body.fromAddress,
      counterpartyAddress: body.toAddress,
      network: body.network,
      tokenType: body.tokenType,
      amount: body.amount.toString(),
    },
    {
      txHash,
      type: "transfer_in",
      walletAddress: body.toAddress,
      counterpartyAddress: body.fromAddress,
      network: body.network,
      tokenType: body.tokenType,
      amount: body.amount.toString(),
    },
  ]);

  res.json({
    success: true,
    txHash,
    amount: body.amount,
    tokenType: body.tokenType,
    fromAddress: body.fromAddress,
    toAddress: body.toAddress,
  });
});

export default router;
