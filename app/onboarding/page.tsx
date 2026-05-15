import Link from "next/link";
import { CheckCircle2, Circle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboardingOverview } from "@/lib/onboarding/state";
import { requireUser } from "@/lib/auth/require";
import { cn } from "@/lib/utils";

// Onboarding overview — stepper showing the 14 steps with their current
// status, plus the three hard-gate checks (room counts, brand voice, photos).
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const overview = await getOnboardingOverview();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <Link href={"/dashboard" as never} className="text-sm text-beachie-deep/70 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-beachie-deep">Onboarding</h1>
        <p className="mt-1 text-sm text-beachie-deep/70">
          {overview.completed} of {overview.total} steps complete. Hard gates: {
            overview.hardGatesGreen ? (
              <span className="font-medium text-green-700">all green</span>
            ) : (
              <span className="font-medium text-yellow-800">
                {overview.hardGates.filter((g) => !g.satisfied).length} blocking
              </span>
            )
          }.
        </p>
      </header>

      {sp.error === "manager_only" ? (
        <div role="alert" className="mb-6 rounded-md border border-beachie-coral bg-beachie-coral/10 px-4 py-2 text-sm text-beachie-coral">
          Manager role required.
        </div>
      ) : null}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Hard gates (PLAN.md §10)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {overview.hardGates.map((g) => (
            <div key={g.gate} className="flex items-start gap-2">
              {g.satisfied ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 text-beachie-coral" aria-hidden />
              )}
              <div>
                <div className="font-medium text-beachie-deep">
                  {gateLabel(g.gate)}
                </div>
                <div className="text-beachie-deep/70">{g.detail}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ol className="space-y-3">
        {overview.steps.map((s) => (
          <li key={s.step.slug}>
            <Link
              href={`/onboarding/${s.step.slug}` as never}
              className={cn(
                "flex items-start gap-3 rounded-md border bg-white px-4 py-3 transition-colors hover:border-beachie-lake",
                s.state === "green" && "border-green-300",
                s.state === "warn" && "border-yellow-300",
                s.state === "blocked" && "border-beachie-coral/50",
                s.state === "pending" && "border-beachie-sand",
              )}
            >
              <StepIcon state={s.state} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-beachie-deep">
                    <span className="mr-2 text-beachie-deep/50">{s.step.num}.</span>
                    {s.step.label}
                    {s.step.hardGate ? (
                      <span className="ml-2 rounded bg-beachie-deep/10 px-1.5 py-0.5 text-xs text-beachie-deep">
                        hard gate
                      </span>
                    ) : null}
                    {s.step.deferred ? (
                      <span className="ml-2 rounded bg-beachie-sand px-1.5 py-0.5 text-xs text-beachie-deep/70">
                        deferred
                      </span>
                    ) : null}
                  </div>
                  <span className={cn("text-xs", stateColour(s.state))}>{stateLabel(s.state)}</span>
                </div>
                <p className="mt-1 text-sm text-beachie-deep/70">{s.step.description}</p>
                <p className="mt-1 text-xs text-beachie-deep/60">{s.detail}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}

function StepIcon({ state }: { state: "green" | "warn" | "blocked" | "pending" }) {
  switch (state) {
    case "green":
      return <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" aria-hidden />;
    case "warn":
      return <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" aria-hidden />;
    case "blocked":
      return <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-beachie-coral" aria-hidden />;
    case "pending":
      return <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-beachie-deep/40" aria-hidden />;
  }
}

function gateLabel(gate: "rooms" | "voice" | "photos") {
  switch (gate) {
    case "rooms":
      return "Room inventory complete (sum = 83)";
    case "voice":
      return "Brand voice reviewed by manager";
    case "photos":
      return "Photo library ≥ 40 photos";
  }
}

function stateColour(state: "green" | "warn" | "blocked" | "pending") {
  return {
    green: "text-green-700",
    warn: "text-yellow-800",
    blocked: "text-beachie-coral",
    pending: "text-beachie-deep/60",
  }[state];
}

function stateLabel(state: "green" | "warn" | "blocked" | "pending") {
  return { green: "done", warn: "placeholder", blocked: "blocked", pending: "pending" }[state];
}
