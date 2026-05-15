import { sql, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { ONBOARDING_STEPS, type OnboardingStep, type HardGate } from "./steps";
import { checkAllGates, type GateStatus } from "./gates";

export type StepStatus = {
  step: OnboardingStep;
  /** "green" — done; "warn" — placeholder data still in use; "blocked" —
   *  hard gate failing; "pending" — manager hasn't started or acknowledged. */
  state: "green" | "warn" | "blocked" | "pending";
  detail: string;
};

export type OnboardingOverview = {
  steps: StepStatus[];
  hardGates: GateStatus[];
  hardGatesGreen: boolean;
  completed: number;
  total: number;
};

// Computes status of all 14 steps. Single round-trip with the gates.
export async function getOnboardingOverview(): Promise<OnboardingOverview> {
  const hardGates = await checkAllGates();
  const gateByName = new Map<HardGate, GateStatus>(hardGates.map((g) => [g.gate, g]));
  const acknowledged = await getAcknowledgedSteps();
  const tableSummaries = await getTableSummaries();

  const steps: StepStatus[] = ONBOARDING_STEPS.map((step) => {
    if (step.hardGate) {
      const g = gateByName.get(step.hardGate)!;
      return {
        step,
        state: g.satisfied ? "green" : "blocked",
        detail: g.detail,
      };
    }
    if (step.knowledgeSlug) {
      const sum = tableSummaries[step.knowledgeSlug];
      if (!sum) {
        return { step, state: "pending", detail: "Not yet touched" };
      }
      if (sum.total === 0) {
        return { step, state: "pending", detail: "No rows yet" };
      }
      if (sum.placeholders === sum.total) {
        return {
          step,
          state: "warn",
          detail: `${sum.total} rows — all still placeholders`,
        };
      }
      if (sum.placeholders === 0) {
        return { step, state: "green", detail: `${sum.total} rows, real data` };
      }
      return {
        step,
        state: "warn",
        detail: `${sum.total - sum.placeholders} real, ${sum.placeholders} placeholder`,
      };
    }
    // Deferred / manually-acknowledgeable steps.
    if (acknowledged.includes(step.slug)) {
      return { step, state: "green", detail: "Acknowledged by manager" };
    }
    return {
      step,
      state: "pending",
      detail: step.deferred ? "Pending — feature lands later" : "Not yet acknowledged",
    };
  });

  const completed = steps.filter((s) => s.state === "green").length;
  const hardGatesGreen = hardGates.every((g) => g.satisfied);

  return { steps, hardGates, hardGatesGreen, completed, total: steps.length };
}

async function getAcknowledgedSteps(): Promise<string[]> {
  const rows = await db
    .select({ acks: schema.systemSettings.onboardingCompletedSteps })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.id, 1))
    .limit(1);
  return rows[0]?.acks ?? [];
}

type Summary = { total: number; placeholders: number };

async function getTableSummaries(): Promise<Record<string, Summary>> {
  const TABLES: Array<{ slug: string; tableName: string }> = [
    { slug: "property-profile", tableName: "property_profile" },
    { slug: "room-types", tableName: "room_types" },
    { slug: "function-spaces", tableName: "function_spaces" },
    { slug: "fb-venues", tableName: "fb_venues" },
    { slug: "regular-programming", tableName: "regular_programming" },
    { slug: "local-pois", tableName: "local_context_pois" },
    { slug: "target-postcodes", tableName: "target_postcodes" },
    { slug: "brand-voice", tableName: "brand_voice" },
    { slug: "operational-constants", tableName: "operational_constants" },
    { slug: "photo-library", tableName: "photo_library" },
    { slug: "talent-database", tableName: "talent_database" },
  ];

  const result: Record<string, Summary> = {};
  await Promise.all(
    TABLES.map(async (t) => {
      const rows = await db.execute<{ total: number; placeholders: number }>(
        sql.raw(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_placeholder)::int AS placeholders FROM ${t.tableName}`,
        ),
      );
      const r = rows[0];
      result[t.slug] = { total: Number(r?.total ?? 0), placeholders: Number(r?.placeholders ?? 0) };
    }),
  );
  return result;
}
