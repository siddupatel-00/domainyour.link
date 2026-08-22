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

export type Redirect = InferSelectModel<typeof redirects>;
export type NewRedirect = InferInsertModel<typeof redirects>;
export type ClickEvent = InferSelectModel<typeof clickEvents>;
