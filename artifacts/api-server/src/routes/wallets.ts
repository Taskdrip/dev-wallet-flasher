import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable } from "@workspace/db/schema";
import { RegisterWalletBody, GetWalletParams, GetWalletQueryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

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
  const { walletAddress } = req.params;
  const { network, tokenType, amount } = req.body as { network: string; tokenType: string; amount: number };

  if (!amount || amount <= 0 || amount > MAX_TOPUP) {
    res.status(400).json({ error: `Amount must be between 1 and ${MAX_TOPUP.toLocaleString()}` });
    return;
  }

  const existing = await db
    .select()
    .from(walletsTable)
    .where(and(eq(walletsTable.walletAddress, walletAddress), eq(walletsTable.network, network)))
    .limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: "Wallet not found. Connect your wallet first." });
    return;
  }

  if (existing[0].isFrozen) {
    res.status(400).json({ error: "Wallet is frozen" });
    return;
  }

  let updated;
  if (tokenType === "USDtz-SIM") {
    updated = await db
      .update(walletsTable)
      .set({ usdtzSimBalance: sql`${walletsTable.usdtzSimBalance} + ${amount}`, lastSeenAt: new Date() })
      .where(eq(walletsTable.id, existing[0].id))
      .returning();
  } else {
    updated = await db
      .update(walletsTable)
      .set({ usdtSimBalance: sql`${walletsTable.usdtSimBalance} + ${amount}`, lastSeenAt: new Date() })
      .where(eq(walletsTable.id, existing[0].id))
      .returning();
  }

  res.json(formatWallet(updated[0]));
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
