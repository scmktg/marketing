import type { FieldConfig } from "@/lib/knowledge/field-types";
import { cn } from "@/lib/utils";

const inputBase =
  "block w-full rounded-md border border-beachie-sand px-3 py-2 text-beachie-deep shadow-sm focus:border-beachie-lake focus:outline-none focus:ring-1 focus:ring-beachie-lake disabled:bg-beachie-sand/30 disabled:text-beachie-deep/60";

export function KnowledgeField({
  field,
  defaultValue,
  disabled,
}: {
  field: FieldConfig;
  defaultValue: string;
  disabled?: boolean;
}) {
  const id = `f_${field.name}`;
  const commonProps = {
    id,
    name: field.name,
    disabled,
    required: field.required,
  };

  return (
    <div className={cn(field.wide ? "md:col-span-2" : "md:col-span-1")}>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-beachie-deep"
      >
        {field.label}
        {field.required ? <span className="ml-0.5 text-beachie-coral">*</span> : null}
      </label>

      {field.type === "textarea" ? (
        <textarea
          {...commonProps}
          defaultValue={defaultValue}
          rows={4}
          className={cn(inputBase, "font-sans")}
        />
      ) : field.type === "json" ? (
        <textarea
          {...commonProps}
          defaultValue={defaultValue}
          rows={6}
          className={cn(inputBase, "font-mono text-xs")}
        />
      ) : field.type === "boolean" ? (
        <div className="flex items-center gap-2 pt-1">
          <input
            {...commonProps}
            type="checkbox"
            defaultChecked={defaultValue === "true"}
            value="on"
            className="h-4 w-4 rounded border-beachie-sand text-beachie-lake focus:ring-beachie-lake disabled:opacity-50"
          />
          {field.help ? (
            <span className="text-xs text-beachie-deep/70">{field.help}</span>
          ) : null}
        </div>
      ) : field.type === "select" ? (
        <select
          {...commonProps}
          defaultValue={defaultValue}
          className={inputBase}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "time" ? (
        <input
          {...commonProps}
          type="time"
          defaultValue={defaultValue}
          className={inputBase}
        />
      ) : field.type === "number" ? (
        <input
          {...commonProps}
          type="number"
          defaultValue={defaultValue}
          className={inputBase}
        />
      ) : field.type === "money_cents" ? (
        <input
          {...commonProps}
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValue}
          className={inputBase}
        />
      ) : (
        <input
          {...commonProps}
          type="text"
          defaultValue={defaultValue}
          className={inputBase}
        />
      )}

      {field.help && field.type !== "boolean" ? (
        <p className="mt-1 text-xs text-beachie-deep/70">{field.help}</p>
      ) : null}
    </div>
  );
}
