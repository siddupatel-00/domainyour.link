import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  uniqueIndex,
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("username_webname_idx").on(table.username, table.webname),
  ]
);

export type Redirect = InferSelectModel<typeof redirects>;
export type NewRedirect = InferInsertModel<typeof redirects>;
