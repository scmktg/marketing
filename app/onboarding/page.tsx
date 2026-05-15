import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Stub for the 14-step onboarding flow. Real implementation lands in
// feat/onboarding (PLAN.md §13 Week 1). Until then, this page documents
// the gate criteria and points the manager at the seed script.
export default function OnboardingStubPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-beachie-deep">Onboarding</h1>
      <p className="mt-2 text-sm text-beachie-deep/70">
        The guided onboarding wizard lands in{" "}
        <code className="rounded bg-beachie-sand px-1">feat/onboarding</code>.
        Until then, seed placeholder data and edit it from{" "}
        <Link href={"/knowledge" as never} className="underline">
          Knowledge
        </Link>
        .
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hard gates (PLAN.md §10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              Room inventory complete — SUM(room_types.count) = property_profile.total_rooms (83).
              <em className="ml-1 text-beachie-deep/60">Seeded as placeholders summing to 83.</em>
            </li>
            <li>
              Brand voice reviewed by manager —{" "}
              <code>brand_voice.reviewed_by_manager = true</code>.
              <em className="ml-1 text-beachie-deep/60">Defaults false; flip from Knowledge → Brand Voice.</em>
            </li>
            <li>
              Photo library ≥ 20 photos.
              <em className="ml-1 text-beachie-deep/60">Upload from Knowledge → Photo Library.</em>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link href={"/dashboard" as never}>
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
