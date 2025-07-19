import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const predictionMarkets = pgTable("prediction_markets", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull(),
  question: text("question").notNull(),
  threshold: real("threshold").notNull(),
  minStake: integer("min_stake").notNull(),
  maxStake: integer("max_stake").notNull(),
  duration: integer("duration").notNull(), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isSettled: boolean("is_settled").default(false).notNull(),
  settlementResult: boolean("settlement_result"),
  creatorPubkey: text("creator_pubkey").notNull(),
  totalYesPool: integer("total_yes_pool").default(0).notNull(),
  totalNoPool: integer("total_no_pool").default(0).notNull(),
  feePercentage: real("fee_percentage").default(5.0).notNull(),
});

export const predictionBets = pgTable("prediction_bets", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").references(() => predictionMarkets.id).notNull(),
  userPubkey: text("user_pubkey").notNull(),
  position: text("position").notNull(), // "yes" or "no"
  amount: integer("amount").notNull(), // in sats
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Breez payment tracking
  invoiceId: text("invoice_id"),
  paymentRequest: text("payment_request"), // bolt11 invoice
  paymentHash: text("payment_hash"),
  isPaid: boolean("is_paid").default(false).notNull(),
  isSettled: boolean("is_settled").default(false).notNull(),
  payout: integer("payout").default(0).notNull(),
  // Payout tracking
  payoutInvoice: text("payout_invoice"), // bolt11 from winner
  payoutTxId: text("payout_tx_id"),
  payoutStatus: text("payout_status").default("pending"), // pending, completed, failed
  payoutRetries: integer("payout_retries").default(0),
  payoutError: text("payout_error"),
  expiresAt: timestamp("expires_at"), // invoice expiry
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPredictionMarketSchema = createInsertSchema(predictionMarkets).omit({
  id: true,
  createdAt: true,
  isSettled: true,
  settlementResult: true,
  totalYesPool: true,
  totalNoPool: true,
});

export const insertPredictionBetSchema = createInsertSchema(predictionBets).omit({
  id: true,
  createdAt: true,
  isSettled: true,
  payout: true,
  payoutTxId: true,
  payoutStatus: true,
  payoutRetries: true,
  payoutError: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PredictionMarket = typeof predictionMarkets.$inferSelect;
export type InsertPredictionMarket = z.infer<typeof insertPredictionMarketSchema>;
export type PredictionBet = typeof predictionBets.$inferSelect;
export type InsertPredictionBet = z.infer<typeof insertPredictionBetSchema>;

// Client-side schemas for prediction markets
export const createMarketSchema = z.object({
  question: z.string().min(10).max(200),
  threshold: z.number().min(-10).max(10),
  minStake: z.number().min(1).max(1000000),
  maxStake: z.number().min(1).max(1000000),
  duration: z.number().min(1).max(1440), // 1 minute to 24 hours (for easier testing)
  feePercentage: z.number().min(0).max(20).optional().default(5.0),
}).refine(data => data.maxStake >= data.minStake, {
  message: "Maximum stake must be greater than or equal to minimum stake",
  path: ["maxStake"],
});

export const placeBetSchema = z.object({
  marketId: z.number().positive(),
  position: z.enum(["yes", "no"]),
  amount: z.number().positive(),
});

export type CreateMarketData = z.infer<typeof createMarketSchema>;
export type PlaceBetData = z.infer<typeof placeBetSchema>;
