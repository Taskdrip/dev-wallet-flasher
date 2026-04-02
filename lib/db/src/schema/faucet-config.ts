import { pgTable, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const faucetConfigTable = pgTable("faucet_config", {
  id: serial("id").primaryKey(),
  tezosUsdtzSimDailyLimit: numeric("tezos_usdtz_sim_daily_limit", { precision: 20, scale: 6 }).notNull().default("1000"),
  ethereumUsdtSimDailyLimit: numeric("ethereum_usdt_sim_daily_limit", { precision: 20, scale: 6 }).notNull().default("1000"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFaucetConfigSchema = createInsertSchema(faucetConfigTable).omit({ id: true, updatedAt: true });
export type InsertFaucetConfig = z.infer<typeof insertFaucetConfigSchema>;
export type FaucetConfig = typeof faucetConfigTable.$inferSelect;
