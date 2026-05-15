import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KNOWLEDGE_TABLE_CONFIGS } from "@/lib/knowledge/tables";
import { getPlaceholderTally } from "@/lib/knowledge/placeholder-tally";
import { requireUser } from "@/lib/auth/require";

// Index of all 11 property knowledge tables. Each card shows a placeholder
// count vs total and links to the table's CRUD view.
export default async function KnowledgeIndexPage() {
  await requireUser();
  const tally = await getPlaceholderTally();
  const perTableByName = new Map(tally.perTable.map((t) => [t.name, t]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-beachie-deep">Property knowledge</h1>
        <p className="mt-1 text-sm text-beachie-deep/70">
          {tally.placeholders} of {tally.total} records still use placeholder data.
          Edit a record to flip <code>is_placeholder</code> to false.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {KNOWLEDGE_TABLE_CONFIGS.map((config) => {
          const counts = perTableByName.get(config.tableName);
          const placeholders = counts?.placeholders ?? 0;
          const total = counts?.total ?? 0;
          const realCount = total - placeholders;
          return (
            <Link key={config.slug} href={`/knowledge/${config.slug}` as never}>
              <Card className="cursor-pointer transition-colors hover:border-beachie-lake">
                <CardHeader>
                  <CardTitle>{config.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {config.isSingleton ? (
                    <p className="text-beachie-deep/80">
                      {placeholders > 0 ? (
                        <span className="text-yellow-700">Placeholder</span>
                      ) : (
                        <span className="text-green-700">Real data</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-beachie-deep/80">
                      {realCount} real · {placeholders} placeholder ·{" "}
                      <span className="text-beachie-deep/60">{total} total</span>
                    </p>
                  )}
                  {config.description ? (
                    <p className="mt-2 text-xs text-beachie-deep/60">
                      {config.description}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
