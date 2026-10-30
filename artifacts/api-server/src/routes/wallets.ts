import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, walletsTable } from "@workspace/db/schema";
import { GetWalletParams, GetWalletQueryParams, RegisterWalletBody, TopUpBody } from "@workspace/api-zod";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/wallets/register", async (req, res) => {
  const body = RegisterWalletBody.parse(req.body);

  const existing = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.walletAddress, body.walletAddress),
        eq(walletsTable.network, body.network),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(walletsTable)
      .set({ lastSeenAt: new Date(), walletType: body.walletType })
      .where(eq(walletsTable.id, existing[0].id));

    const updated = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, existing[0].id))
      .limit(1);

    res.json(formatWallet(updated[0]));
    return;
  }

  const inserted = await db
    .insert(walletsTable)
    .values({
      walletAddress: body.walletAddress,
      network: body.network,
      walletType: body.walletType,
    })
    .returning();

  res.json(formatWallet(inserted[0]));
});

router.get("/wallets/:walletAddress", async (req, res) => {
  const params = GetWalletParams.parse(req.params);
  const query = GetWalletQueryParams.parse(req.query);

  const wallet = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.walletAddress, params.walletAddress),
        eq(walletsTable.network, query.network),
      ),
    )
    .limit(1);

  if (wallet.length === 0) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.json(formatWallet(wallet[0]));
});

const MAX_TOPUP = 200_000_000;

router.post("/wallets/:walletAddress/topup", async (req, res) => {
  const params = GetWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  const parsedBody = TopUpBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.issues[0]?.message ?? "Invalid top-up request" });
    return;
  }

  const { walletAddress } = params.data;
  const { network, tokenType, amount } = parsedBody.data;
  if ((network === "tezos") !== (tokenType === "USDtz-SIM")) {
    res.status(400).json({ error: "USDtz-SIM is only available on Tezos; use USDT-SIM on EVM and Tron testnets." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(walletsTable)
      .where(and(eq(walletsTable.walletAddress, walletAddress), eq(walletsTable.network, network)))
      .limit(1)
      .for("update");

    if (existing.length === 0) {
      return { status: 404 as const, error: "Wallet not found. Connect your wallet first." };
    }
    if (existing[0].isFrozen) {
      return { status: 400 as const, error: "Wallet is frozen" };
    }

    const updated = tokenType === "USDtz-SIM"
      ? await tx.update(walletsTable)
          .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${amount}`, lastSeenAt: new Date() })
          .where(eq(walletsTable.id, existing[0].id))
          .returning()
      : await tx.update(walletsTable)
          .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${amount}`, lastSeenAt: new Date() })
          .where(eq(walletsTable.id, existing[0].id))
          .returning();

    await tx.insert(transactionsTable).values({
      txHash: `SIM-${crypto.randomUUID()}`,
      type: "topup",
      walletAddress,
      counterpartyAddress: "SIMULATED_TOP_UP",
      network,
      tokenType,
      amount: amount.toString(),
    });

    return { wallet: updated[0] };
  });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(formatWallet(result.wallet));
});

router.post("/wallets/:walletAddress/auto-accumulate", async (req, res) => {
  const { walletAddress } = req.params;
  const { network, enabled } = req.body as { network: string; enabled: boolean };

  const existing = await db
    .select()
    .from(walletsTable)
    .where(and(eq(walletsTable.walletAddress, walletAddress), eq(walletsTable.network, network)))
    .limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const updated = await db
    .update(walletsTable)
    .set({ autoAccumulate: enabled, lastSeenAt: new Date() })
    .where(eq(walletsTable.id, existing[0].id))
    .returning();

  res.json(formatWallet(updated[0]));
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
    autoAccumulate: w.autoAccumulate,
    createdAt: w.createdAt.toISOString(),
    lastSeenAt: w.lastSeenAt.toISOString(),
  };
}

export default router;
export { formatWallet };
