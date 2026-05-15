import { AlertTriangle } from "lucide-react";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

// Shown on every admin page when system_settings.production_mode = false.
// See PLAN.md §3.1.
export async function ProductionModeBanner() {
  const rows = await db
    .select({ productionMode: schema.systemSettings.productionMode })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.id, 1))
    .limit(1);

  // Default behaviour: if the settings row hasn't been seeded yet, treat as
  // not-in-production (safer default).
  const productionMode = rows[0]?.productionMode ?? false;
  if (productionMode) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-yellow-500 bg-yellow-100 px-4 py-3 text-sm text-yellow-900"
      data-testid="production-mode-banner"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div>
        <strong className="font-semibold">Production mode disabled</strong> —
        outputs are for review only, do not distribute. All generated marketing
        assets are watermarked &ldquo;TEST&rdquo;. Flip in Settings once all
        placeholder data is replaced and onboarding is signed off.
      </div>
    </div>
  );
}
