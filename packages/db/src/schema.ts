import {
  bigint,
  bigserial,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const worlds = pgTable("worlds", {
  id: text("id").primaryKey(),
  revision: bigint("revision", { mode: "bigint" }).notNull().default(0n),
  fencingToken: bigint("fencing_token", { mode: "bigint" }).notNull().default(0n),
  ownerId: text("owner_id"),
  simVersion: text("sim_version").notNull(),
  contentVersion: text("content_version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commandReceipts = pgTable(
  "command_receipts",
  {
    scope: text("scope").notNull(),
    commandId: text("command_id").notNull(),
    requestHash: text("request_hash").notNull(),
    result: jsonb("result").notNull(),
    worldRevision: bigint("world_revision", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.commandId] })],
);

export const eventOutbox = pgTable("event_outbox", {
  sequence: bigserial("sequence", { mode: "bigint" }).primaryKey(),
  eventId: text("event_id").notNull().unique(),
  worldId: text("world_id").notNull(),
  worldRevision: bigint("world_revision", { mode: "bigint" }).notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  causeIds: jsonb("cause_ids").notNull(),
  publishStatus: text("publish_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const worldSnapshots = pgTable(
  "world_snapshots",
  {
    worldId: text("world_id").notNull(),
    worldRevision: bigint("world_revision", { mode: "bigint" }).notNull(),
    fencingToken: bigint("fencing_token", { mode: "bigint" }).notNull(),
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.worldId, table.worldRevision] })],
);
