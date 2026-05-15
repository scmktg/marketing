"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/get-user";
import { auditLog } from "@/lib/audit";
import { getStep } from "@/lib/onboarding/steps";

function managerOnly(user: { role: string } | null) {
  if (user?.role !== "manager") {
    redirect("/onboarding?error=manager_only");
  }
}

// Adds slug to system_settings.onboarding_completed_steps (idempotent).
export async function acknowledgeStep(slug: string) {
  const step = getStep(slug);
  if (!step) redirect("/onboarding?error=unknown_step");

  const user = await getCurrentUser();
  managerOnly(user);

  await db
    .update(schema.systemSettings)
    .set({
      onboardingCompletedSteps: sql`
        CASE
          WHEN ${slug} = ANY(onboarding_completed_steps) THEN onboarding_completed_steps
          ELSE array_append(onboarding_completed_steps, ${slug})
        END
      `,
      updatedAt: new Date(),
    })
    .where(eq(schema.systemSettings.id, 1));

  await auditLog({
    userId: user?.id ?? null,
    action: "onboarding.step_acknowledged",
    entityType: "onboarding",
    entityId: slug,
    before: null,
    after: { slug, num: step!.num },
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  redirect("/onboarding");
}

// Removes slug from onboarding_completed_steps. Allows the manager to
// un-acknowledge a step if they want to revisit it.
export async function unacknowledgeStep(slug: string) {
  const step = getStep(slug);
  if (!step) redirect("/onboarding?error=unknown_step");

  const user = await getCurrentUser();
  managerOnly(user);

  await db
    .update(schema.systemSettings)
    .set({
      onboardingCompletedSteps: sql`array_remove(onboarding_completed_steps, ${slug})`,
      updatedAt: new Date(),
    })
    .where(eq(schema.systemSettings.id, 1));

  await auditLog({
    userId: user?.id ?? null,
    action: "onboarding.step_unacknowledged",
    entityType: "onboarding",
    entityId: slug,
    before: null,
    after: { slug },
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  redirect(`/onboarding/${slug}`);
}

// Convenience action used by the brand-voice step. Flips
// brand_voice.reviewed_by_manager → true. The hard-gate check in
// lib/onboarding/gates.ts reads this directly; no need to also acknowledge.
export async function markBrandVoiceReviewed() {
  const user = await getCurrentUser();
  managerOnly(user);

  const before = await db
    .select({ reviewed: schema.brandVoice.reviewedByManager })
    .from(schema.brandVoice)
    .where(eq(schema.brandVoice.id, 1))
    .limit(1);

  await db
    .update(schema.brandVoice)
    .set({
      reviewedByManager: true,
      reviewedAt: new Date(),
      reviewedBy: user?.id ?? null,
      isPlaceholder: false,
      updatedAt: new Date(),
    })
    .where(eq(schema.brandVoice.id, 1));

  await auditLog({
    userId: user?.id ?? null,
    action: "brand_voice.reviewed",
    entityType: "brand_voice",
    entityId: "1",
    before: { reviewed: before[0]?.reviewed ?? false },
    after: { reviewed: true },
  });

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/brand-voice");
  revalidatePath("/dashboard");
  revalidatePath("/knowledge/brand-voice");
  redirect("/onboarding/brand-voice?saved=1");
}
