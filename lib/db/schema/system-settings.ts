import { pgTable, integer, boolean, text, time, timestamp, uuid, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Singleton row. Enforced by the `singleton_row` check constraint below.
export const systemSettings = pgTable(
  "system_settings",
  {
    id: integer("id").primaryKey().default(1),

    // Granular kill-switch flags. v1 UI exposes a single master toggle that
    // flips all three together; the backend always checks the specific flag
    // that applies (see PLAN.md §7).
    generationPaused: boolean("generation_paused").notNull().default(false),
    cronPaused: boolean("cron_paused").notNull().default(false),
    onDemandPaused: boolean("on_demand_paused").notNull().default(false),

    // Production mode gate. False means every generated marketing asset is
    // watermarked TEST and the distribution checklist refuses to mark sent.
    // See PLAN.md §3.1.
    productionMode: boolean("production_mode").notNull().default(false),

    monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(50000),
    viabilityCheckDaysPreEvent: integer("viability_check_days_pre_event").notNull().default(14),
    cronProposalTime: time("cron_proposal_time").notNull().default("06:00:00"),
    cronDigestTime: time("cron_digest_time").notNull().default("08:00:00"),

    // Reference to a secret stored outside the DB (e.g. Vercel env). Stored
    // here as a label so the audit log can record "key rotated" without ever
    // touching the secret value.
    openaiApiKeyRef: text("openai_api_key_ref").notNull().default("default"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => ({
    singletonRow: check("system_settings_singleton", sql`${table.id} = 1`),
  }),
);

export type SystemSettings = typeof systemSettings.$inferSelect;
