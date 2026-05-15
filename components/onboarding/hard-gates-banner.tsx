import Link from "next/link";
import { XCircle, CheckCircle2 } from "lucide-react";
import { checkAllGates } from "@/lib/onboarding/gates";

// Persistent banner on the dashboard showing the three §10 hard gates.
// When any gate is unsatisfied, the generation pipelines refuse (gate check
// lives in lib/onboarding/gates.ts).
export async function HardGatesBanner() {
  const gates = await checkAllGates();
  const allGreen = gates.every((g) => g.satisfied);

  if (allGreen) {
    return (
      <div
        className="flex items-start gap-3 rounded-md border border-green-400 bg-green-50 px-4 py-3 text-sm text-green-900"
        data-testid="hard-gates-banner"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <div>
          <strong className="font-semibold">All hard gates green.</strong> Generation is
          unblocked (subject to <code>system_settings.production_mode</code> for distribution).
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-yellow-500 bg-yellow-100 px-4 py-3 text-sm text-yellow-900"
      data-testid="hard-gates-banner"
    >
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-beachie-coral" aria-hidden />
        <div className="flex-1">
          <strong className="font-semibold">Hard gates blocking generation</strong> —
          generation pipelines refuse until all three are green (PLAN.md §10).
          <ul className="mt-2 space-y-1">
            {gates
              .filter((g) => !g.satisfied)
              .map((g) => (
                <li key={g.gate} className="text-xs">
                  <strong className="font-medium">
                    {g.gate === "rooms" && "Room inventory: "}
                    {g.gate === "voice" && "Brand voice: "}
                    {g.gate === "photos" && "Photo library: "}
                  </strong>
                  {g.detail}
                </li>
              ))}
          </ul>
          <Link
            href={"/onboarding" as never}
            className="mt-2 inline-block text-xs font-medium underline"
          >
            Open onboarding →
          </Link>
        </div>
      </div>
    </div>
  );
}
