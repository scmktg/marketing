import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlaceholderTally } from "@/lib/knowledge/placeholder-tally";

// Live tally rendered on the dashboard. Server Component — queries on every
// render. See PLAN.md §3.1.
export async function PlaceholderTally() {
  const tally = await getPlaceholderTally();
  const allReal = tally.placeholders === 0 && tally.total > 0;

  return (
    <Card data-testid="placeholder-tally">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {allReal ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Property knowledge complete
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Property knowledge — placeholder data in use
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tally.total === 0 ? (
          <p className="text-sm text-beachie-deep/80">
            No property knowledge rows yet. Run{" "}
            <code className="rounded bg-beachie-sand px-1">pnpm seed:property</code>{" "}
            to seed placeholders, or finish{" "}
            <Link href={"/onboarding" as never} className="underline">
              onboarding
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-sm text-beachie-deep">
              <strong className="text-base">
                {tally.placeholders} of {tally.total}
              </strong>{" "}
              property knowledge records still use placeholder data.
            </p>
            {!allReal && (
              <p className="mt-2 text-xs text-beachie-deep/70">
                Replace placeholders with real data from the onboarding workbook
                before flipping production mode on.
              </p>
            )}
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-beachie-deep/80">
                Per-table breakdown
              </summary>
              <table className="mt-2 w-full text-left">
                <thead className="text-beachie-deep/60">
                  <tr>
                    <th className="py-1 pr-4">Table</th>
                    <th className="py-1 pr-4">Total</th>
                    <th className="py-1">Placeholder</th>
                  </tr>
                </thead>
                <tbody>
                  {tally.perTable.map((t) => (
                    <tr key={t.name} className="border-t border-beachie-sand/60">
                      <td className="py-1 pr-4 font-mono">{t.name}</td>
                      <td className="py-1 pr-4">{t.total}</td>
                      <td className="py-1">
                        {t.placeholders > 0 ? (
                          <span className="text-yellow-700">{t.placeholders}</span>
                        ) : (
                          <span className="text-green-700">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
