import type { FieldConfig } from "./field-types";

// Converts FormData → typed values for write.
// Strings are trimmed; empty strings become null for non-required fields.
export function parseFormData(
  formData: FormData,
  fields: FieldConfig[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = formData.get(field.name);
    out[field.name] = parseField(raw, field);
  }

  return out;
}

function parseField(raw: FormDataEntryValue | null, field: FieldConfig): unknown {
  if (field.type === "boolean") {
    // Unchecked checkboxes don't submit at all. Treat absence as false.
    return raw === "on" || raw === "true";
  }

  if (raw === null) return null;
  const str = typeof raw === "string" ? raw.trim() : "";

  if (str === "") {
    if (field.required) {
      throw new ValidationError(field.name, `${field.label} is required`);
    }
    return null;
  }

  switch (field.type) {
    case "number": {
      const n = Number(str);
      if (!Number.isFinite(n)) {
        throw new ValidationError(field.name, `${field.label} must be a number`);
      }
      return Math.trunc(n);
    }
    case "money_cents": {
      const n = Number(str);
      if (!Number.isFinite(n) || n < 0) {
        throw new ValidationError(field.name, `${field.label} must be a positive number`);
      }
      return Math.round(n * 100);
    }
    case "json": {
      try {
        return JSON.parse(str);
      } catch {
        throw new ValidationError(field.name, `${field.label} must be valid JSON`);
      }
    }
    case "tags": {
      // Comma-separated → string[].
      return str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    case "time":
    case "text":
    case "textarea":
    case "select":
      return str;
  }
}

export class ValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Inverse: takes a DB row and returns string values suitable for HTML inputs.
export function serializeForInput(
  row: Record<string, unknown> | null,
  field: FieldConfig,
): string {
  if (!row) return "";
  const value = row[field.name];
  if (value === null || value === undefined) return "";

  switch (field.type) {
    case "money_cents":
      return typeof value === "number" ? (value / 100).toFixed(2) : "";
    case "json":
      return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    case "tags":
      return Array.isArray(value) ? value.join(", ") : "";
    case "boolean":
      return value ? "true" : "false";
    case "time":
      // HH:MM:SS → HH:MM for <input type="time">.
      return typeof value === "string" ? value.slice(0, 5) : "";
    default:
      return String(value);
  }
}
