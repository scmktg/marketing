// Field-type registry powering the generic edit forms.
// Keep this narrow — anything more elaborate (multi-step forms, file upload,
// reorderable lists) gets a custom page in app/(admin)/knowledge/<table>/.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money_cents" // displays/edits as dollars in the UI, stored as integer cents
  | "boolean"
  | "select"
  | "tags"
  | "time"
  | "json";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>; // for "select"
  help?: string;
  /** Wide inputs (textarea, json) take a full row in the form grid. */
  wide?: boolean;
};

export type TableConfig = {
  /** URL slug under /knowledge/<slug>. */
  slug: string;
  /** Display name. */
  label: string;
  /** SQL table name (matches Drizzle table name; used for audit log). */
  tableName: string;
  /** Singleton row tables (property_profile, brand_voice, operational_constants, system_settings). */
  isSingleton: boolean;
  /** Display columns for the list view (non-singletons only). */
  listColumns?: Array<{ field: string; label: string; render?: (v: unknown) => string }>;
  /** Form field config. */
  fields: FieldConfig[];
  /** Optional description shown on the edit form. */
  description?: string;
};
