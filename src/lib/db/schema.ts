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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_username_idx").on(table.username),
    uniqueIndex("user_email_idx").on(table.email),
  ]
);

export const redirects = pgTable(
  "redirects",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    webname: varchar("webname", { length: 128 }).notNull(),
    destinationUrl: text("destination_url").notNull(),
    redirectCode: integer("redirect_code").default(307).notNull(),
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
    expiresAt: timestamp("expires_at"), // Null = permanent; Timestamp = temporary expiring sub-bio
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("username_bioname_idx").on(table.username, table.bioname),
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

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Redirect = InferSelectModel<typeof redirects>;
export type NewRedirect = InferInsertModel<typeof redirects>;
export type Bio = InferSelectModel<typeof bios>;
export type NewBio = InferInsertModel<typeof bios>;
export type ClickEvent = InferSelectModel<typeof clickEvents>;
export type Employee = InferSelectModel<typeof employees>;
export type NewEmployee = InferInsertModel<typeof employees>;
