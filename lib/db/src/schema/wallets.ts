import { pgTable, serial, text, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  walletAddress: text("wallet_address").notNull(),
  network: text("network").notNull(),
  walletType: text("wallet_type").notNull(),
  usdtzSimBalance: numeric("usdtz_sim_balance", { precision: 20, scale: 6 }).notNull().default("0"),
  usdtSimBalance: numeric("usdt_sim_balance", { precision: 20, scale: 6 }).notNull().default("0"),
  isFrozen: boolean("is_frozen").notNull().default(false),
  autoAccumulate: boolean("auto_accumulate").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true, lastSeenAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
