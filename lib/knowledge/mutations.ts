import { eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db/client";
import { auditLog } from "@/lib/audit";
import { getTableConfig } from "./tables";

// Resolves a table slug ("room-types") to its Drizzle table object.
// Centralising this means the generic edit pages never import schema directly.
const TABLE_MAP: Record<string, PgTable> = {
  "property-profile": schema.propertyProfile,
  "room-types": schema.roomTypes,
  "function-spaces": schema.functionSpaces,
  "fb-venues": schema.fbVenues,
  "regular-programming": schema.regularProgramming,
  "local-pois": schema.localContextPois,
  "target-postcodes": schema.targetPostcodes,
  "brand-voice": schema.brandVoice,
  "operational-constants": schema.operationalConstants,
  "photo-library": schema.photoLibrary,
  "talent-database": schema.talentDatabase,
};

function resolveTable(slug: string): { table: PgTable; tableName: string } | null {
  const table = TABLE_MAP[slug];
  const config = getTableConfig(slug);
  if (!table || !config) return null;
  return { table, tableName: config.tableName };
}

export function getTable(slug: string): PgTable | null {
  return TABLE_MAP[slug] ?? null;
}

// Drizzle generic-table operations need looser typing than per-table calls.
// We deliberately use `any` for the row shape — this is the one place in the
// codebase that does runtime table dispatch, and the column shape is enforced
// by the TableConfig + parseFormData on the way in.
type Row = Record<string, any>;

// Updates a row by id. Always:
//   1) Flips is_placeholder to false (PLAN.md §3.1).
//   2) Sets updated_at to now().
//   3) Writes an audit_log entry with before/after.
export async function updateKnowledgeRow({
  slug,
  id,
  values,
  userId,
}: {
  slug: string;
  id: string;
  values: Record<string, unknown>;
  userId: string | null;
}) {
  const resolved = resolveTable(slug);
  if (!resolved) throw new Error(`Unknown table slug: ${slug}`);
  const { table, tableName } = resolved;
  const idCol = (table as any).id;

  const before = (await db.select().from(table).where(eq(idCol, id)).limit(1)) as Row[];

  const updateValues = {
    ...values,
    isPlaceholder: false,
    updatedAt: new Date(),
  };

  const updated = (await db
    .update(table)
    .set(updateValues as any)
    .where(eq(idCol, id))
    .returning()) as Row[];

  await auditLog({
    userId,
    action: `${tableName}.updated`,
    entityType: tableName,
    entityId: id,
    before: before[0] ?? null,
    after: updated[0] ?? null,
  });

  return updated[0];
}

// Updates the singleton row (id=1).
export async function updateSingletonRow({
  slug,
  values,
  userId,
}: {
  slug: string;
  values: Record<string, unknown>;
  userId: string | null;
}) {
  const resolved = resolveTable(slug);
  if (!resolved) throw new Error(`Unknown table slug: ${slug}`);
  const { table, tableName } = resolved;
  const idCol = (table as any).id;

  const before = (await db.select().from(table).where(eq(idCol, 1)).limit(1)) as Row[];

  const updateValues = {
    ...values,
    isPlaceholder: false,
    updatedAt: new Date(),
  };

  const updated = (await db
    .update(table)
    .set(updateValues as any)
    .where(eq(idCol, 1))
    .returning()) as Row[];

  await auditLog({
    userId,
    action: `${tableName}.updated`,
    entityType: tableName,
    entityId: "1",
    before: before[0] ?? null,
    after: updated[0] ?? null,
  });

  return updated[0];
}

// Inserts a new row. is_placeholder=false from the start — a manager-created
// row is real data by definition.
export async function insertKnowledgeRow({
  slug,
  values,
  userId,
}: {
  slug: string;
  values: Record<string, unknown>;
  userId: string | null;
}) {
  const resolved = resolveTable(slug);
  if (!resolved) throw new Error(`Unknown table slug: ${slug}`);
  const { table, tableName } = resolved;

  const inserted = (await db
    .insert(table)
    .values({ ...values, isPlaceholder: false } as any)
    .returning()) as Row[];

  await auditLog({
    userId,
    action: `${tableName}.created`,
    entityType: tableName,
    entityId: String(inserted[0]?.id ?? ""),
    before: null,
    after: inserted[0] ?? null,
  });

  return inserted[0];
}

// Deletes a row. Used sparingly — most knowledge edits are updates.
export async function deleteKnowledgeRow({
  slug,
  id,
  userId,
}: {
  slug: string;
  id: string;
  userId: string | null;
}) {
  const resolved = resolveTable(slug);
  if (!resolved) throw new Error(`Unknown table slug: ${slug}`);
  const { table, tableName } = resolved;
  const idCol = (table as any).id;

  const before = (await db.select().from(table).where(eq(idCol, id)).limit(1)) as Row[];

  await db.delete(table).where(eq(idCol, id));

  await auditLog({
    userId,
    action: `${tableName}.deleted`,
    entityType: tableName,
    entityId: id,
    before: before[0] ?? null,
    after: null,
  });
}

// Returns COUNT(*) for the table.
export async function countRows(slug: string): Promise<number> {
  const resolved = resolveTable(slug);
  if (!resolved) return 0;
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM ${resolved.table}`,
  );
  return Number(result[0]?.count ?? 0);
}
