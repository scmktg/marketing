import { sql, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { HardGate } from "./steps";

export type GateStatus = {
  gate: HardGate;
  satisfied: boolean;
  detail: string;
};

// Hard-gate checks per PLAN.md §10.
//   rooms  — SUM(room_types.count) = property_profile.total_rooms
//   voice  — brand_voice.reviewed_by_manager = true
//   photos — COUNT(photo_library) >= 40
export async function checkAllGates(): Promise<GateStatus[]> {
  return [await checkRoomsGate(), await checkVoiceGate(), await checkPhotosGate()];
}

export async function checkRoomsGate(): Promise<GateStatus> {
  const profile = await db
    .select({ totalRooms: schema.propertyProfile.totalRooms })
    .from(schema.propertyProfile)
    .where(eq(schema.propertyProfile.id, 1))
    .limit(1);
  const declared = profile[0]?.totalRooms ?? null;

  const sumRows = await db.execute<{ sum: number }>(
    sql`SELECT COALESCE(SUM(count), 0)::int AS sum FROM room_types`,
  );
  const actual = Number(sumRows[0]?.sum ?? 0);

  if (declared == null) {
    return {
      gate: "rooms",
      satisfied: false,
      detail: "property_profile not yet seeded",
    };
  }

  return {
    gate: "rooms",
    satisfied: actual === declared,
    detail:
      actual === declared
        ? `${actual} rooms allocated across all types`
        : `room_types.count sums to ${actual}, property_profile.total_rooms is ${declared}`,
  };
}

export async function checkVoiceGate(): Promise<GateStatus> {
  const rows = await db
    .select({ reviewed: schema.brandVoice.reviewedByManager })
    .from(schema.brandVoice)
    .where(eq(schema.brandVoice.id, 1))
    .limit(1);
  const reviewed = rows[0]?.reviewed === true;
  return {
    gate: "voice",
    satisfied: reviewed,
    detail: reviewed
      ? "Manager has reviewed the brand voice guide"
      : "Brand voice not yet reviewed by manager",
  };
}

export async function checkPhotosGate(): Promise<GateStatus> {
  const countRows = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM photo_library`,
  );
  const n = Number(countRows[0]?.count ?? 0);
  return {
    gate: "photos",
    satisfied: n >= 40,
    detail: n >= 40 ? `${n} photos uploaded` : `${n} of 40 photos uploaded`,
  };
}

export async function checkGate(gate: HardGate): Promise<GateStatus> {
  switch (gate) {
    case "rooms":
      return checkRoomsGate();
    case "voice":
      return checkVoiceGate();
    case "photos":
      return checkPhotosGate();
  }
}

// Returns true iff every hard gate is satisfied.
// Called at the top of every generation pipeline (lands in feat/prompt-runtime).
export async function allHardGatesGreen(): Promise<boolean> {
  const all = await checkAllGates();
  return all.every((g) => g.satisfied);
}
