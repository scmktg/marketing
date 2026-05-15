import type { TableConfig } from "@/lib/knowledge/field-types";
import { serializeForInput } from "@/lib/knowledge/form-parse";
import { KnowledgeField } from "./field";
import { Button } from "@/components/ui/button";
import { PlaceholderBanner } from "@/components/placeholder-banner";

export function KnowledgeEditForm({
  config,
  row,
  action,
  canWrite,
  error,
  submitLabel = "Save",
}: {
  config: TableConfig;
  row: Record<string, unknown> | null;
  action: (formData: FormData) => void;
  canWrite: boolean;
  error?: string;
  submitLabel?: string;
}) {
  const isPlaceholder = row?.isPlaceholder === true;

  return (
    <div className="space-y-4">
      {isPlaceholder ? (
        <PlaceholderBanner recordLabel={recordLabelFromRow(config, row)} />
      ) : null}

      {!canWrite ? (
        <div className="rounded-md border border-beachie-sand bg-beachie-sand/40 px-4 py-3 text-sm text-beachie-deep/80">
          You have read-only access. Ask a manager to make changes.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-beachie-coral bg-beachie-coral/10 px-4 py-3 text-sm text-beachie-coral"
          data-testid="edit-form-error"
        >
          {error}
        </div>
      ) : null}

      <form action={action} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {config.fields.map((field) => (
            <KnowledgeField
              key={field.name}
              field={field}
              defaultValue={serializeForInput(row, field)}
              disabled={!canWrite}
            />
          ))}
        </div>

        {canWrite ? (
          <div className="flex items-center gap-3">
            <Button type="submit">{submitLabel}</Button>
            <span className="text-xs text-beachie-deep/60">
              Saving flips <code>is_placeholder</code> to false.
            </span>
          </div>
        ) : null}
      </form>
    </div>
  );
}

function recordLabelFromRow(
  config: TableConfig,
  row: Record<string, unknown> | null,
): string {
  if (!row) return config.label;
  // Heuristic: prefer `name`, fall back to `event`, then `postcode`, then the slug.
  const candidates = ["name", "event", "postcode", "altText"];
  for (const key of candidates) {
    const v = row[key];
    if (typeof v === "string" && v) return `${config.label}: ${v}`;
  }
  return config.label;
}
