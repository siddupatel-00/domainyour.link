import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    password: text("password"), // Hashed password
    avatar: text("avatar"), // Base64 data URI or image URL
    bioCode: varchar("bio_code", { length: 32 }), // Permanent short code for main bio e.g. "k9f2w1"
    previousUsernames: text("previous_usernames").default("[]"), // JSON stringified array of previous usernames
    recapPreference: varchar("recap_preference", { length: 32 }).default("off").notNull(), // "off" | "weekly" | "monthly"
    lastRecapSentAt: timestamp("last_recap_sent_at"),
    plan: varchar("plan", { length: 32 }).default("free").notNull(), // "free" | "pro"
    subscriptionId: varchar("subscription_id", { length: 128 }), // Razorpay subscription ID
    subscriptionStatus: varchar("subscription_status", { length: 32 }).default("active"), // "active" | "canceled" | "past_due"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_username_idx").on(table.username),
    uniqueIndex("user_email_idx").on(table.email),
    index("user_bio_code_idx").on(table.bioCode),
  ]
);

export const redirects = pgTable(
  "redirects",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    webname: varchar("webname", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }), // User-friendly link title (e.g. "github-project")
    destinationUrl: text("destination_url").notNull(),
    redirectCode: integer("redirect_code").default(307).notNull(),
    code: varchar("code", { length: 32 }), // Permanent short code e.g. "a1b2c3"
    clickCount: integer("click_count").default(0).notNull(),
    expiredClickCount: integer("expired_click_count").default(0).notNull(), // Clicks received after link expired
    expiresAt: timestamp("expires_at"), // Null means permanent; Timestamp means temporary expiring link
    parentId: integer("parent_id"), // Optional parent redirect ID if this is a sub-link
    showOnProfile: boolean("show_on_profile").default(true).notNull(), // Whether to show on public profile /username
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("username_webname_idx").on(table.username, table.webname),
    index("redirects_code_idx").on(table.code),
  ]
);

export const bios = pgTable(
  "bios",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    bioname: varchar("bioname", { length: 128 }).notNull(), // e.g. "main", "work", "gaming", "hackathon"
    title: varchar("title", { length: 255 }), // Display title e.g. "Work & Portfolio"
    description: text("description"), // Short description
    linkIds: text("link_ids").notNull().default("[]"), // JSON stringified array of redirect IDs e.g. "[1, 4]"
    code: varchar("code", { length: 32 }), // Permanent short code for sub-bio e.g. "m4p8k2"
    expiresAt: timestamp("expires_at"), // Null = permanent; Timestamp = temporary expiring sub-bio
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("username_bioname_idx").on(table.username, table.bioname),
    index("bios_code_idx").on(table.code),
  ]
);

export const linkGroups = pgTable(
  "link_groups",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(), // e.g. "GitHub Projects", "Socials"
    color: varchar("color", { length: 32 }).default("#000000"), // Optional badge color
    linkIds: text("link_ids").notNull().default("[]"), // JSON stringified array of redirect IDs e.g. "[1, 4, 8]"
    shareCode: varchar("share_code", { length: 32 }), // Random short code e.g. "4k2pm9"
    isShared: boolean("is_shared").default(true).notNull(), // Sharing on/off
    expiresAt: timestamp("expires_at"), // Null = permanent; Timestamp = temporary expiring
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("link_groups_username_idx").on(table.username),
  ]
);

export const clickEvents = pgTable(
  "click_events",
  {
    id: serial("id").primaryKey(),
    redirectId: integer("redirect_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("click_redirect_id_idx").on(table.redirectId),
    index("click_created_at_idx").on(table.createdAt),
  ]
);

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 128 }).default(""),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 64 }),
    password: text("password"),
    role: varchar("role", { length: 64 }).notNull().default("Insights Viewer"),
    status: varchar("status", { length: 32 }).notNull().default("invited"), // "invited" | "active" | "suspended"
    inviteToken: varchar("invite_token", { length: 128 }),
    permissions: text("permissions").notNull().default("[\"view_insights\"]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("employee_email_idx").on(table.email),
    uniqueIndex("employee_invite_token_idx").on(table.inviteToken),
  ]
);

// Tombstone registry of all permanently retired/reserved codes (never re-issued)
export const usedCodes = pgTable(
  "used_codes",
  {
    code: varchar("code", { length: 32 }).primaryKey(),
    type: varchar("type", { length: 16 }).notNull(), // 'link' | 'bio' | 'group'
    username: varchar("username", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Redirect = InferSelectModel<typeof redirects>;
export type NewRedirect = InferInsertModel<typeof redirects>;
export type Bio = InferSelectModel<typeof bios>;
export type NewBio = InferInsertModel<typeof bios>;
export type LinkGroup = InferSelectModel<typeof linkGroups>;
export type NewLinkGroup = InferInsertModel<typeof linkGroups>;
export type ClickEvent = InferSelectModel<typeof clickEvents>;
export type NewClickEvent = InferInsertModel<typeof clickEvents>;
export type Employee = InferSelectModel<typeof employees>;
export type NewEmployee = InferInsertModel<typeof employees>;
export type UsedCode = InferSelectModel<typeof usedCodes>;
export type NewUsedCode = InferInsertModel<typeof usedCodes>;
