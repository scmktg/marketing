import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { requireUser } from "@/lib/auth/require";
import { getTableConfig } from "@/lib/knowledge/tables";
import { getTable } from "@/lib/knowledge/mutations";
import { saveSingleton } from "./actions";
import { KnowledgeEditForm } from "@/components/knowledge/edit-form";
import { Button } from "@/components/ui/button";

// Per-table page.
//   Singleton (e.g. property-profile): renders the edit form directly.
//   List (e.g. room-types): renders the list with "Add" + per-row links.
export default async function KnowledgeTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { table: slug } = await params;
  const sp = await searchParams;

  const config = getTableConfig(slug);
  if (!config) notFound();

  const user = await getCurrentUser();
  const canWrite = user?.role === "manager";
  const table = getTable(slug);
  if (!table) notFound();

  if (config.isSingleton) {
    const rows = await db
      .select()
      .from(table)
      // @ts-expect-error — singleton id column accessor
      .where(eq(table.id as never, 1 as never))
      .limit(1);
    const row = rows[0] ?? null;
    const action = saveSingleton.bind(null, slug);

    return (
      <div className="space-y-6">
        <header>
          <Link href={"/knowledge" as never} className="text-sm text-beachie-deep/70 hover:underline">
            ← All tables
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-beachie-deep">{config.label}</h1>
          {config.description ? (
            <p className="mt-1 text-sm text-beachie-deep/70">{config.description}</p>
          ) : null}
        </header>

        {sp.saved ? (
          <div className="rounded-md border border-green-500 bg-green-50 px-4 py-2 text-sm text-green-900">
            Saved.
          </div>
        ) : null}

        <KnowledgeEditForm
          config={config}
          row={row as Record<string, unknown> | null}
          action={action}
          canWrite={canWrite}
          error={sp.error}
        />
      </div>
    );
  }

  // List view.
  const rows = (await db.select().from(table)) as Array<Record<string, unknown>>;
  const cols = config.listColumns ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <Link href={"/knowledge" as never} className="text-sm text-beachie-deep/70 hover:underline">
            ← All tables
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-beachie-deep">{config.label}</h1>
          {config.description ? (
            <p className="mt-1 text-sm text-beachie-deep/70">{config.description}</p>
          ) : null}
        </div>
        {canWrite ? (
          <Link href={`/knowledge/${slug}/new` as never}>
            <Button>Add new</Button>
          </Link>
        ) : null}
      </header>

      {sp.error ? (
        <div role="alert" className="rounded-md border border-beachie-coral bg-beachie-coral/10 px-4 py-2 text-sm text-beachie-coral">
          {sp.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-beachie-sand">
        <table className="w-full text-left text-sm">
          <thead className="bg-beachie-sand/40 text-beachie-deep">
            <tr>
              {cols.map((c) => (
                <th key={c.field} className="px-3 py-2 font-medium">{c.label}</th>
              ))}
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 2} className="px-3 py-6 text-center text-beachie-deep/60">
                  No rows yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = String(row.id ?? "");
                const isPlaceholder = row.isPlaceholder === true;
                return (
                  <tr key={id} className="border-t border-beachie-sand">
                    {cols.map((c) => {
                      const raw = row[c.field];
                      const v = c.render ? c.render(raw) : raw == null ? "—" : String(raw);
                      return (
                        <td key={c.field} className="px-3 py-2">{v}</td>
                      );
                    })}
                    <td className="px-3 py-2">
                      {isPlaceholder ? (
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">
                          placeholder
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-900">
                          real
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/knowledge/${slug}/${id}` as never} className="text-sm text-beachie-lake hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
