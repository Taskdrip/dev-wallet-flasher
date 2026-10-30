import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable } from "@workspace/db/schema";
import { SendFlashTokenBody, TransferTokensBody } from "@workspace/api-zod";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { isValidWalletAddress, walletTypeForNetwork } from "../lib/wallet-address";

const router: IRouter = Router();

function normalizeWalletAddress(address: string, network: string): string {
  return network === "ethereum" || network === "bnb" ? address.toLowerCase() : address;
}

router.post("/transfer", async (req, res) => {
  const parsed = TransferTokensBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid transfer request." });
    return;
  }
  const body = parsed.data;
  if ((body.network === "tezos") !== (body.tokenType === "USDtz-SIM")) {
    res.status(400).json({ error: "USDtz-SIM is only available on Tezos; use USDT-SIM on Ethereum, BNB, or Tron." });
    return;
  }

  const fromAddress = normalizeWalletAddress(body.fromAddress, body.network);
  const toAddress = normalizeWalletAddress(body.toAddress, body.network);
  if (!isValidWalletAddress(toAddress, body.network)) {
    res.status(400).json({ error: `Enter a valid ${body.network} testnet wallet address.` });
    return;
  }
  if (fromAddress === toAddress) {
    res.status(400).json({ error: "Sender and recipient must be different wallets." });
    return;
  }

  const txHash = `SIM-${crypto.randomUUID()}`;
  const result = await db.transaction(async (tx) => {
    const sender = await tx
      .select()
      .from(walletsTable)
      .where(and(
        eq(walletsTable.walletAddress, fromAddress),
        eq(walletsTable.network, body.network),
        eq(walletsTable.userId, req.authUser!.id),
      ))
      .limit(1)
      .for("update");

    if (sender.length === 0) return { error: "Sender wallet is not linked to your account.", status: 404 as const };
    if (sender[0].isFrozen) return { error: "Sender wallet is frozen and cannot transfer tokens.", status: 400 as const };

    const receiver = await tx
      .select()
      .from(walletsTable)
      .where(and(
        eq(walletsTable.walletAddress, toAddress),
        eq(walletsTable.network, body.network),
      ))
      .limit(1)
      .for("update");

    if (receiver[0]?.isFrozen) {
      return { error: "Recipient wallet is frozen and cannot receive test tokens.", status: 400 as const };
    }

    const balanceField = body.tokenType === "USDtz-SIM" ? "usdtzSimBalance" : "usdtSimBalance";
    const senderBalance = Number(sender[0][balanceField] ?? "0");
    if (senderBalance < body.amount) {
      return { error: `Insufficient ${body.tokenType} balance. Have ${senderBalance}, need ${body.amount}.`, status: 400 as const };
    }

    let receiverId = receiver[0]?.id;
    if (!receiverId) {
      const [createdReceiver] = await tx
        .insert(walletsTable)
        .values({
          walletAddress: toAddress,
          network: body.network,
          walletType: walletTypeForNetwork(body.network),
        })
        .returning({ id: walletsTable.id });
      receiverId = createdReceiver.id;
    }

    if (body.tokenType === "USDtz-SIM") {
      await tx.update(walletsTable)
        .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} - ${body.amount}` })
        .where(eq(walletsTable.id, sender[0].id));
      await tx.update(walletsTable)
        .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${body.amount}` })
        .where(eq(walletsTable.id, receiverId));
    } else {
      await tx.update(walletsTable)
        .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} - ${body.amount}` })
        .where(eq(walletsTable.id, sender[0].id));
      await tx.update(walletsTable)
        .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${body.amount}` })
        .where(eq(walletsTable.id, receiverId));
    }

    await tx.insert(transactionsTable).values([
      {
        txHash,
        type: "transfer_out",
        walletAddress: fromAddress,
        counterpartyAddress: toAddress,
        network: body.network,
        tokenType: body.tokenType,
        amount: body.amount.toString(),
      },
      {
        txHash,
        type: "transfer_in",
        walletAddress: toAddress,
        counterpartyAddress: fromAddress,
        network: body.network,
        tokenType: body.tokenType,
        amount: body.amount.toString(),
      },
    ]);
    return { success: true as const };
  });

  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    txHash,
    amount: body.amount,
    tokenType: body.tokenType,
    fromAddress,
    toAddress,
  });
});

router.post("/flash/send", async (req, res) => {
  const parsedBody = SendFlashTokenBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.issues[0]?.message ?? "Invalid flash send request" });
    return;
  }

  const { fromAddress, toAddress, network, tokenType, amount, message } = parsedBody.data;
  if (!isValidWalletAddress(toAddress, network)) {
    res.status(400).json({ error: `Enter a valid ${network} testnet wallet address.` });
    return;
  }
  if ((network === "tezos") !== (tokenType === "USDtz-SIM")) {
    res.status(400).json({ error: "USDtz-SIM is only available on Tezos; use USDT-SIM on EVM and Tron testnets." });
    return;
  }

  const simulationId = `SIM-${crypto.randomUUID()}`;
  const normalizedToAddress = normalizeWalletAddress(toAddress, network);
  const result = await db.transaction(async (tx) => {
    const receiver = await tx
      .select()
      .from(walletsTable)
      .where(and(
        eq(walletsTable.walletAddress, normalizedToAddress),
        eq(walletsTable.network, network),
      ))
      .limit(1)
      .for("update");

    if (receiver[0]?.isFrozen) {
      return { status: 400 as const, error: "Recipient wallet is frozen and cannot receive simulated tokens." };
    }

    let receiverId = receiver[0]?.id;
    if (!receiverId) {
      const [createdReceiver] = await tx
        .insert(walletsTable)
        .values({
          walletAddress: normalizedToAddress,
          network,
          walletType: walletTypeForNetwork(network),
        })
        .returning({ id: walletsTable.id });
      receiverId = createdReceiver.id;
    }

    if (tokenType === "USDtz-SIM") {
      await tx
        .update(walletsTable)
        .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${amount}`, lastSeenAt: new Date() })
        .where(eq(walletsTable.id, receiverId));
    } else {
      await tx
        .update(walletsTable)
        .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${amount}`, lastSeenAt: new Date() })
        .where(eq(walletsTable.id, receiverId));
    }

    await tx.insert(transactionsTable).values({
      txHash: simulationId,
      type: "transfer_in",
      walletAddress: normalizedToAddress,
      counterpartyAddress: fromAddress || "SIMULATED_FLASH_FAUCET",
      network,
      tokenType,
      amount: amount.toString(),
    });

    return { success: true as const };
  });

  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    txHash: simulationId,
    amount,
    tokenType,
    toAddress: normalizedToAddress,
    message: message ?? null,
  });
});

export default router;
