import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ONBOARDING_STEPS, getStep } from "@/lib/onboarding/steps";
import { getOnboardingOverview } from "@/lib/onboarding/state";
import { acknowledgeStep, unacknowledgeStep, markBrandVoiceReviewed } from "../actions";

export default async function OnboardingStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { step: slug } = await params;
  const sp = await searchParams;

  const step = getStep(slug);
  if (!step) notFound();

  const user = await getCurrentUser();
  const canManage = user?.role === "manager";

  const overview = await getOnboardingOverview();
  const status = overview.steps.find((s) => s.step.slug === slug)!;
  const acknowledged = status.state === "green" && (step.manuallyAcknowledgeable || step.deferred);

  const prev = ONBOARDING_STEPS[step.num - 2];
  const next = ONBOARDING_STEPS[step.num];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href={"/onboarding" as never} className="text-sm text-beachie-deep/70 hover:underline">
        ← All steps
      </Link>

      <div className="mt-2 mb-6">
        <p className="text-xs uppercase tracking-wider text-beachie-deep/60">
          Step {step.num} of {ONBOARDING_STEPS.length}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-beachie-deep">{step.label}</h1>
        <p className="mt-1 text-sm text-beachie-deep/70">{step.description}</p>
      </div>

      {sp.saved ? (
        <div className="mb-4 rounded-md border border-green-500 bg-green-50 px-4 py-2 text-sm text-green-900">
          Saved.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-beachie-deep/80">{status.detail}</p>
          {step.hardGate ? (
            <p className="mt-2 text-xs text-beachie-deep/60">
              This is a hard gate (PLAN.md §10). Generation refuses while it&apos;s blocking.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        {step.deferred ? (
          <Card>
            <CardHeader>
              <CardTitle>Deferred</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-beachie-deep/80">
                The full UI for this step lands in a later PR. For now, acknowledge it manually
                and continue.
              </p>
              {step.slug === "api-keys" ? (
                <p className="mt-2 text-xs text-beachie-deep/60">
                  Set <code>OPENAI_API_KEY</code> and the monthly budget cap on the Vercel
                  environment config. The cap is enforced at runtime by{" "}
                  <code>lib/ai/client.ts</code> (lands in <code>feat/prompt-runtime</code>).
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : step.knowledgeSlug ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit in Knowledge</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-beachie-deep/80">
                This step edits the <code>{step.knowledgeSlug}</code> knowledge table. Open it,
                replace placeholders with real data, and return here.
              </p>
              <Link href={`/knowledge/${step.knowledgeSlug}` as never}>
                <Button variant="outline" size="sm">
                  <span>Open {step.label}</span>
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {/* Per-step action: brand-voice has a dedicated "Mark reviewed" button. */}
        {step.slug === "brand-voice" && canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Manager sign-off</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-beachie-deep/80">
                After reviewing the brand voice guide, mark it reviewed. This is the §10 hard
                gate that unblocks asset generation.
              </p>
              <form action={markBrandVoiceReviewed}>
                <Button type="submit">I have reviewed the voice guide</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {/* Manual acknowledge for steps that don't auto-derive. */}
        {(step.manuallyAcknowledgeable || step.deferred) && canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Acknowledge</CardTitle>
            </CardHeader>
            <CardContent>
              {acknowledged ? (
                <form action={unacknowledgeStep.bind(null, step.slug)}>
                  <p className="mb-3 text-sm text-beachie-deep/80">
                    You&apos;ve acknowledged this step. Click to revisit.
                  </p>
                  <Button type="submit" variant="outline" size="sm">
                    Un-acknowledge
                  </Button>
                </form>
              ) : (
                <form action={acknowledgeStep.bind(null, step.slug)}>
                  <p className="mb-3 text-sm text-beachie-deep/80">
                    Mark this step done. Recorded in the audit log.
                  </p>
                  <Button type="submit">Mark step done</Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}

        {!canManage ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-beachie-deep/80">
                Read-only — ask a manager to complete this step.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <nav className="mt-8 flex items-center justify-between">
        {prev ? (
          <Link href={`/onboarding/${prev.slug}` as never}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              {prev.label}
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={`/onboarding/${next.slug}` as never}>
            <Button variant="ghost" size="sm">
              {next.label}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </main>
  );
}
