import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const faucetClaimsTable = pgTable("faucet_claims", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  network: text("network").notNull(),
  tokenType: text("token_type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

export const insertFaucetClaimSchema = createInsertSchema(faucetClaimsTable).omit({ id: true, claimedAt: true });
export type InsertFaucetClaim = z.infer<typeof insertFaucetClaimSchema>;
export type FaucetClaim = typeof faucetClaimsTable.$inferSelect;
