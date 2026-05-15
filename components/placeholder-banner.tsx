import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Yellow banner shown over any property knowledge record where
// is_placeholder = true. See PLAN.md §3.1.
//
// Used inline above record edit forms. The dashboard tally lives in
// components/placeholder-tally.tsx.
export function PlaceholderBanner({
  className,
  recordLabel,
}: {
  className?: string;
  /** Optional — name of the record this banner is attached to, for the message. */
  recordLabel?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900",
        className,
      )}
      data-testid="placeholder-banner"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div>
        <strong className="font-semibold">Seed data</strong>
        {recordLabel ? ` for ${recordLabel}` : ""} — replace with real data from
        the onboarding workbook before going live.
      </div>
    </div>
  );
}
