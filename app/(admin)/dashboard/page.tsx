import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceholderTally } from "@/components/placeholder-tally";
import { ProductionModeBanner } from "@/components/production-mode-banner";

// Dashboard. Mostly empty in v1 scaffold — KPI tiles, pipeline kanban,
// today's queue, and recent learnings land in their respective PRs.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <ProductionModeBanner />

      <div>
        <h1 className="text-2xl font-semibold text-beachie-deep">Dashboard</h1>
        <p className="mt-1 text-sm text-beachie-deep/70">
          Scaffold placeholder — KPI tiles, pipeline kanban, today&apos;s queue, and
          recent learnings land in subsequent PRs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderTally />
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-beachie-deep/60">
            Coming in <code className="rounded bg-beachie-sand px-1">feat/proposals-ui</code>.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
