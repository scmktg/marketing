import { db, schema } from "@/lib/db/client";

// Action name follows `<entity>.<verb>` convention. We don't constrain the
// verb because the action vocabulary grows organically — onboarding events,
// auth events, asset events. Validation is on us, not the type system.
export type AuditAction = `${string}.${string}`;

export type AuditEntry = {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

// Every mutating server action MUST call this. Enforced by the
// custom ESLint rule in eslint-rules/require-audit-log.js.
//
// Fire-and-forget by design — audit writes must never block the
// caller's response. Failures are logged but do not throw.
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before as object | null,
      after: entry.after as object | null,
    });
  } catch (err) {
    // Last-resort: do not throw from audit. Surface in logs.
    console.error("[audit] write failed", { entry, err });
  }
}
