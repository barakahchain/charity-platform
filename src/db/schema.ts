import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("donor").notNull(),
  kycStatus: text("kyc_status").default("pending").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userWallets = sqliteTable("user_wallets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  walletAddress: text("wallet_address").notNull().unique(),
  isPrimary: integer("is_primary", { mode: "boolean" })
    .notNull()
    .default(false),
  status: text("status").notNull().default("active"),
  // 'active', 'revoked', 'lost', 'compromised'

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const walletEvents = sqliteTable("wallet_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userWalletId: integer("user_wallet_id")
    .notNull()
    .references(() => userWallets.id),
  eventType: text("event_type").notNull(), // e.g. 'added', 'revoked', 'used_for_project', 'donation'
  metadata: text("metadata"), // JSON
  createdAt: text("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  charityId: integer("charity_id")
    .notNull()
    .references(() => users.id),
  walletAddress: text("wallet_address").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  metaCid: text("meta_cid").notNull(),
  zakatMode: integer("zakat_mode", { mode: "boolean" })
    .notNull()
    .default(false),
  asnafTag: text("asnaf_tag"),
  contractTemplate: text("contract_template").notNull(),
  totalAmount: real("total_amount").notNull(),
  fundedBalance: real("funded_balance").notNull().default(0),
  status: text("status").notNull().default("active"),
  blockchainTxHash: text("blockchain_tx_hash"),
  contractAddress: text("contract_address").unique(),
  deadline: text("deadline"), 
  deadlineEnabled: integer("deadline_enabled", { mode: "boolean" }).default(false), 
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  beneficiaryAddress: text("beneficiary_address").notNull(),
  evidenceCid: text("evidence_cid"),
  evidenceUrl: text("evidence_url"),
  evidenceType: text("evidence_type"),
  status: text("status").notNull().default("pending"), // 'pending', 'submitted', 'verified', 'rejected', 'paid'
  submittedAt: text("submitted_at"),
  verifiedAt: text("verified_at"),
  verifierId: integer("verifier_id").references(() => users.id),
  verificationNotes: text("verification_notes"),
  blockchainTxHash: text("blockchain_tx_hash"),
  createdAt: text("created_at").notNull(),
});

export const donations = sqliteTable("donations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  donorId: integer("donor_id").references(() => users.id),
  donorWalletAddress: text("donor_wallet_address").notNull(),
  amount: real("amount").notNull(),
  txHash: text("tx_hash").notNull().unique(),
  blockNumber: integer("block_number"),
  createdAt: text("created_at").notNull(),
});
