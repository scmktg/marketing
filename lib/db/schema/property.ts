import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  date,
  time,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Every property knowledge table carries `is_placeholder` (default true).
// Seed-script rows are placeholders until the manager edits them in the
// admin UI — first save flips the flag to false. See PLAN.md §3.1.
//
// The cross-table constraint SUM(room_types.count) = property_profile.total_rooms
// cannot be expressed as a Drizzle check constraint (Postgres disallows subqueries
// in CHECK). It is enforced by a trigger added in a follow-up SQL migration
// (supabase/migrations/<after-init>_room_count_invariant.sql) AND validated in
// the application layer at every write to room_types or property_profile.

export const roomTier = pgEnum("room_tier", ["Premium", "Mid", "Lower", "Entry", "Value"]);
export const partnerRegion = pgEnum("partner_region", [
  "western_sydney",
  "north_shore",
  "newcastle_lake_macquarie",
  "central_coast",
  "other",
]);

// ── property_profile ─────────────────────────────────────────────────────────
// Singleton row.
export const propertyProfile = pgTable(
  "property_profile",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    nickname: text("nickname").notNull(),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    brandCollection: text("brand_collection"),
    totalRooms: integer("total_rooms").notNull(),
    style: text("style").notNull(),
    setting: text("setting").notNull(),
    distanceSydneyCbdMin: integer("distance_sydney_cbd_min"),
    distanceNewcastleMin: integer("distance_newcastle_min"),
    tagline: text("tagline"),
    website: text("website"),
    instagram: text("instagram"),
    facebook: text("facebook"),
    bookingEngineInternal: text("booking_engine_internal"),
    eventBookingSystem: text("event_booking_system"),
    restaurantBookingSystem: text("restaurant_booking_system"),
    pms: text("pms"),
    isPlaceholder: boolean("is_placeholder").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    singletonRow: check("property_profile_singleton", sql`${table.id} = 1`),
  }),
);

// ── room_types ───────────────────────────────────────────────────────────────
export const roomTypes = pgTable("room_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  beds: text("beds").notNull(),
  maxGuests: integer("max_guests").notNull(),
  tier: roomTier("tier").notNull(),
  view: text("view"),
  notableFeatures: text("notable_features"),
  retireeSuitabilityNotes: text("retiree_suitability_notes"),
  count: integer("count").notNull().default(0),
  standardMidweekRateLow: integer("standard_midweek_rate_low_cents"),
  standardMidweekRateHigh: integer("standard_midweek_rate_high_cents"),
  isAccessible: boolean("is_accessible").notNull().default(false),
  mobilityFriendlyCount: integer("mobility_friendly_count").notNull().default(0),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── function_spaces ──────────────────────────────────────────────────────────
export const functionSpaces = pgTable("function_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  style: text("style"),
  views: text("views"),
  capacityCocktail: integer("capacity_cocktail"),
  capacityBanquet: integer("capacity_banquet"),
  capacityTheatre: integer("capacity_theatre"),
  bestFor: text("best_for"),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── fb_venues ────────────────────────────────────────────────────────────────
export const fbVenues = pgTable("fb_venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  style: text("style"),
  capacity: integer("capacity"),
  notes: text("notes"),
  costPerHeadBreakfastCents: integer("cost_per_head_breakfast_cents"),
  costPerHeadLunchCents: integer("cost_per_head_lunch_cents"),
  costPerHeadDinner2cCents: integer("cost_per_head_dinner_2c_cents"),
  costPerHeadDinner3cCents: integer("cost_per_head_dinner_3c_cents"),
  costPerHeadCanapesCents: integer("cost_per_head_canapes_cents"),
  beveragePackageOptions: jsonb("beverage_package_options"),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── regular_programming ──────────────────────────────────────────────────────
export const regularProgrammingFrequency = pgEnum("regular_programming_frequency", [
  "weekly",
  "fortnightly",
  "monthly",
  "annual",
]);

export const regularProgramming = pgTable("regular_programming", {
  id: uuid("id").primaryKey().defaultRandom(),
  event: text("event").notNull(),
  frequency: regularProgrammingFrequency("frequency").notNull(),
  dayOfWeek: text("day_of_week"),
  time: time("time"),
  venue: text("venue"),
  impactNotes: text("impact_notes"),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── local_context_pois ───────────────────────────────────────────────────────
export const localContextPois = pgTable("local_context_pois", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  distanceMin: integer("distance_min"),
  notes: text("notes"),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── target_postcodes ─────────────────────────────────────────────────────────
export const targetPostcodes = pgTable("target_postcodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  region: partnerRegion("region").notNull(),
  postcode: text("postcode").notNull().unique(),
  suburbs: text("suburbs"),
  driveTimeMin: integer("drive_time_min"),
  retireeDensity: text("retiree_density"),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── brand_voice ──────────────────────────────────────────────────────────────
// Singleton row. `reviewed_by_manager` is the §10 hard gate that blocks
// asset generation until the manager has explicitly confirmed the voice guide.
export const brandVoice = pgTable(
  "brand_voice",
  {
    id: integer("id").primaryKey().default(1),
    version: integer("version").notNull().default(1),
    reviewedByManager: boolean("reviewed_by_manager").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by"),
    rules: jsonb("rules").notNull().default(sql`'{}'::jsonb`),
    guideMarkdown: text("guide_markdown").notNull().default(""),
    forbiddenPhrases: text("forbidden_phrases").array().notNull().default(sql`ARRAY[]::text[]`),
    requiredPhrasesPerContext: jsonb("required_phrases_per_context").notNull().default(sql`'{}'::jsonb`),
    isPlaceholder: boolean("is_placeholder").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    singletonRow: check("brand_voice_singleton", sql`${table.id} = 1`),
  }),
);

// ── operational_constants ────────────────────────────────────────────────────
// Singleton row.
export const operationalConstants = pgTable(
  "operational_constants",
  {
    id: integer("id").primaryKey().default(1),
    blackoutDates: jsonb("blackout_dates").notNull().default(sql`'[]'::jsonb`),
    rateFloorsCents: jsonb("rate_floors_cents").notNull().default(sql`'{}'::jsonb`),
    rateCeilingsCents: jsonb("rate_ceilings_cents").notNull().default(sql`'{}'::jsonb`),
    accessibilityNotes: text("accessibility_notes").notNull().default(""),
    mobilityFriendlyApprovedPhrase: text("mobility_friendly_approved_phrase").notNull().default(
      "Ground floor, walk-in shower, close to lifts and parking.",
    ),
    choiceHotelsBrandNotes: text("choice_hotels_brand_notes").notNull().default(""),
    brandVoiceScoreThreshold: integer("brand_voice_score_threshold").notNull().default(70),
    isPlaceholder: boolean("is_placeholder").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    singletonRow: check("operational_constants_singleton", sql`${table.id} = 1`),
  }),
);

// ── photo_library ────────────────────────────────────────────────────────────
export const photoLibrary = pgTable("photo_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  storagePath: text("storage_path").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  altText: text("alt_text").notNull(),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── talent_database ──────────────────────────────────────────────────────────
export const talentDatabase = pgTable("talent_database", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  contact: text("contact"),
  feeRangeLowCents: integer("fee_range_low_cents"),
  feeRangeHighCents: integer("fee_range_high_cents"),
  notes: text("notes"),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Convenience: every property knowledge table, in one place. Used by the
// dashboard placeholder tally to enumerate sources without hard-coding.
export const propertyKnowledgeTables = [
  { name: "property_profile", table: propertyProfile },
  { name: "room_types", table: roomTypes },
  { name: "function_spaces", table: functionSpaces },
  { name: "fb_venues", table: fbVenues },
  { name: "regular_programming", table: regularProgramming },
  { name: "local_context_pois", table: localContextPois },
  { name: "target_postcodes", table: targetPostcodes },
  { name: "brand_voice", table: brandVoice },
  { name: "operational_constants", table: operationalConstants },
  { name: "photo_library", table: photoLibrary },
  { name: "talent_database", table: talentDatabase },
] as const;
