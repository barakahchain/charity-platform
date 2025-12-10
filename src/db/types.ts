// src/db/types.ts
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  userWallets,
  walletEvents,
  projects,
  milestones,
  donations,
} from "./schema";

// Select types (for reading data)
export type User = InferSelectModel<typeof users>;
export type UserWallet = InferSelectModel<typeof userWallets>;
export type WalletEvent = InferSelectModel<typeof walletEvents>;
export type Project = InferSelectModel<typeof projects>;
export type Milestone = InferSelectModel<typeof milestones>;
export type Donation = InferSelectModel<typeof donations>;

// Insert types (for creating data)
export type InsertUser = InferInsertModel<typeof users>;
export type InsertUserWallet = InferInsertModel<typeof userWallets>;
export type InsertWalletEvent = InferInsertModel<typeof walletEvents>;
export type InsertProject = InferInsertModel<typeof projects>;
export type InsertMilestone = InferInsertModel<typeof milestones>;
export type InsertDonation = InferInsertModel<typeof donations>;

// Optional: Create a barrel export
export * from "./schema";