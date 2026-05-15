import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTableConfig } from "@/lib/knowledge/tables";
import { getTable } from "@/lib/knowledge/mutations";
import { saveRow, deleteRow } from "../actions";
import { KnowledgeEditForm } from "@/components/knowledge/edit-form";
import { Button } from "@/components/ui/button";

// Edit one row (or create new when id === "new").
// Singleton tables don't use this route — their edit form lives at /knowledge/[table].
export default async function KnowledgeRowEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string; id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { table: slug, id } = await params;
  const sp = await searchParams;

  const config = getTableConfig(slug);
  if (!config || config.isSingleton) notFound();

  const user = await getCurrentUser();
  const canWrite = user?.role === "manager";
  const drizzleTable = getTable(slug);
  if (!drizzleTable) notFound();

  let row: Record<string, unknown> | null = null;
  if (id !== "new") {
    const rows = await db
      .select()
      .from(drizzleTable)
      // @ts-expect-error — runtime id accessor
      .where(eq(drizzleTable.id as never, id as never))
      .limit(1);
    row = (rows[0] as Record<string, unknown> | undefined) ?? null;
    if (!row) notFound();
  }

  const action = saveRow.bind(null, slug, id);
  const deleteAction = id !== "new" ? deleteRow.bind(null, slug, id) : null;

  return (
    <div className="space-y-6">
      <header>
        <Link href={`/knowledge/${slug}` as never} className="text-sm text-beachie-deep/70 hover:underline">
          ← {config.label}
        </Link>
        <div className="mt-1 flex items-end justify-between">
          <h1 className="text-2xl font-semibold text-beachie-deep">
            {id === "new" ? `New ${config.label.toLowerCase()}` : `Edit ${config.label.toLowerCase()}`}
          </h1>
          {deleteAction && canWrite ? (
            <form action={deleteAction}>
              <Button type="submit" variant="danger" size="sm">
                Delete
              </Button>
            </form>
          ) : null}
        </div>
      </header>

      {sp.saved ? (
        <div className="rounded-md border border-green-500 bg-green-50 px-4 py-2 text-sm text-green-900">
          Saved.
        </div>
      ) : null}

      <KnowledgeEditForm
        config={config}
        row={row}
        action={action}
        canWrite={canWrite}
        error={sp.error}
        submitLabel={id === "new" ? "Create" : "Save"}
      />
    </div>
  );
}
