import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

// Every mutating server action writes here. See PLAN.md §4.5 — DB role
// separation prevents DELETE; this is enforced via a follow-up migration
// granting only INSERT + SELECT to the app role.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
  }),
);

export type AuditLogEntry = typeof auditLog.$inferSelect;
