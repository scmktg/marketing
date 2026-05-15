import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { propertyKnowledgeTables } from "@/lib/db/schema/property";

export type PlaceholderTally = {
  total: number;
  placeholders: number;
  perTable: Array<{ name: string; total: number; placeholders: number }>;
};

// Counts placeholder rows across every property knowledge table.
// Used by the dashboard tally and the production_mode flip-eligibility check.
export async function getPlaceholderTally(): Promise<PlaceholderTally> {
  const perTable = await Promise.all(
    propertyKnowledgeTables.map(async ({ name, table }) => {
      // @ts-expect-error — drizzle-orm sql.identifier typing is loose
      const [{ total, placeholders }] = await db.execute<{
        total: number;
        placeholders: number;
      }>(
        sql`SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_placeholder)::int AS placeholders
            FROM ${table}`,
      );
      return { name, total: Number(total), placeholders: Number(placeholders) };
    }),
  );

  const total = perTable.reduce((s, t) => s + t.total, 0);
  const placeholders = perTable.reduce((s, t) => s + t.placeholders, 0);

  return { total, placeholders, perTable };
}
