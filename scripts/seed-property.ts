#!/usr/bin/env tsx
/**
 * scripts/seed-property.ts — Property knowledge seed
 *
 * Populates every property knowledge table with plausible values so the build
 * can run end-to-end before the onboarding workbook arrives.
 *
 * Provenance of seed values (see PLAN.md §3.1):
 *
 *   PUBLIC      — Confirmed from public sources (Beachie website, booking
 *                 platforms, marketing materials). Taken verbatim from
 *                 brief §2.2. Examples: hotel name, address, phone, total
 *                 room count (83), brand identifiers, target postcodes,
 *                 known regular programming.
 *
 *   PLACEHOLDER — Realistic Australian-regional-resort values invented for
 *                 fields the manager has not yet supplied. Marked
 *                 `is_placeholder: true` on every row. Every row carries
 *                 this flag; the first manager edit in the admin UI flips
 *                 it to false. Examples: per-room-type counts (must sum to
 *                 83), midweek rate ranges, F&B cost-per-head benchmarks,
 *                 function space capacities, mobility-friendly counts.
 *
 *   DERIVED     — Computed from other seed values. Today: only the
 *                 room-count-sums-to-83 invariant.
 *
 * Room-count placeholder logic:
 *   Sum of `count` across all room_types MUST equal property_profile.total_rooms (83).
 *   Allocation favours mid-tier waterfront rooms (the §2.2 "HIGH-LEVERAGE FOR
 *   RETIREES" rows): Water View + Poolside get the bulk. Premium Deluxe rooms
 *   are scarcer. Urban + Essential cover the long tail.
 *
 * Idempotency:
 *   The script uses ON CONFLICT DO NOTHING for unique-keyed rows and explicit
 *   id=1 upserts for singleton rows. Re-running the script is a no-op for
 *   rows that already exist — it will not overwrite manager edits. To force
 *   a re-seed of a specific row, delete it manually first.
 */

// Env loaded via `tsx --env-file=.env.local` in the npm script.
import { db, schema } from "@/lib/db/client";
import { sql } from "drizzle-orm";

const SEED_TOTAL_ROOMS = 83;

// ── Room-type counts — must sum to SEED_TOTAL_ROOMS ─────────────────────────
// Allocation rationale:
//   Water View (mid, twin-share)        — 22  flagship retiree workhorse
//   Poolside (mid, twin-share)          — 18  retiree pair workhorse
//   Water View Deluxe (premium)         —  8  scarce premium waterfront
//   Poolside Deluxe (premium)           —  6  scarce premium poolside
//   Urban Deluxe (lower)                —  9  de-prioritised for retirees
//   Urban (entry)                       — 12  de-prioritised for retirees
//   Essential (value, no view)          —  8  rate-padding, honest framing
//   TOTAL                                  83
const ROOM_TYPE_SEEDS = [
  {
    name: "Water View Deluxe",
    beds: "1 king + 1 sofa bed",
    maxGuests: 3,
    tier: "Premium" as const,
    view: "Lake",
    notableFeatures: "Separate bathtub, balcony",
    retireeSuitabilityNotes:
      "Excellent for couples wanting waterfront premium; sofa bed not for sleeping retirees",
    count: 8,
    standardMidweekRateLow: 38900,
    standardMidweekRateHigh: 47900,
    isAccessible: false,
    mobilityFriendlyCount: 1,
  },
  {
    name: "Poolside Deluxe",
    beds: "1 king + 1 sofa bed",
    maxGuests: 3,
    tier: "Premium" as const,
    view: "Pool + lake",
    notableFeatures: "Separate bathtub, balcony",
    retireeSuitabilityNotes:
      "Excellent for couples; pool proximity good for low-mobility",
    count: 6,
    standardMidweekRateLow: 36900,
    standardMidweekRateHigh: 45900,
    isAccessible: false,
    mobilityFriendlyCount: 2,
  },
  {
    name: "Water View",
    beds: "1 king OR 2 doubles",
    maxGuests: 4,
    tier: "Mid" as const,
    view: "Lake",
    notableFeatures: '55" smart TV, balcony, bar fridge',
    retireeSuitabilityNotes:
      "HIGH-LEVERAGE FOR RETIREES — twin-share configuration is the workhorse for friend-pair travel",
    count: 22,
    standardMidweekRateLow: 28900,
    standardMidweekRateHigh: 36900,
    isAccessible: false,
    mobilityFriendlyCount: 4,
  },
  {
    name: "Poolside",
    beds: "1 king OR 2 queens",
    maxGuests: 4,
    tier: "Mid" as const,
    view: "Pool + lake",
    notableFeatures: '55" smart TV, terrace, bar fridge',
    retireeSuitabilityNotes:
      "High-leverage for retiree pairs; queens preferred over doubles for older guests",
    count: 18,
    standardMidweekRateLow: 26900,
    standardMidweekRateHigh: 34900,
    isAccessible: false,
    mobilityFriendlyCount: 3,
  },
  {
    name: "Urban Deluxe",
    beds: "1 king",
    maxGuests: 2,
    tier: "Lower" as const,
    view: "Street",
    notableFeatures: '55" smart TV, bar fridge',
    retireeSuitabilityNotes:
      "De-prioritise for retiree campaigns; waterfront is the draw",
    count: 9,
    standardMidweekRateLow: 21900,
    standardMidweekRateHigh: 26900,
    isAccessible: true,
    mobilityFriendlyCount: 1,
  },
  {
    name: "Urban",
    beds: "1 king",
    maxGuests: 2,
    tier: "Entry" as const,
    view: "Street",
    notableFeatures: '55" smart TV, bar fridge',
    retireeSuitabilityNotes: "De-prioritise for retiree campaigns",
    count: 12,
    standardMidweekRateLow: 18900,
    standardMidweekRateHigh: 23900,
    isAccessible: false,
    mobilityFriendlyCount: 0,
  },
  {
    name: "Essential (no view)",
    beds: "1 queen OR 2 queens",
    maxGuests: 4,
    tier: "Value" as const,
    view: null,
    notableFeatures: '55" smart TV, bar fridge',
    retireeSuitabilityNotes:
      "Useful for group rate-padding when view rooms run out; honest framing only — never marketed as premium",
    count: 8,
    standardMidweekRateLow: 15900,
    standardMidweekRateHigh: 19900,
    isAccessible: false,
    mobilityFriendlyCount: 0,
  },
] as const;

const FUNCTION_SPACE_SEEDS = [
  {
    name: "Foreshore Room",
    style:
      "Hamptons, polished timber floors, floor-to-ceiling bifolds, private courtyard",
    views: "Lakefront",
    capacityCocktail: 120,
    capacityBanquet: 80,
    capacityTheatre: 100,
    bestFor:
      "Flagship for group dinners, cocktail receptions, large retiree group events",
  },
  {
    name: "Lake View Room",
    style: "Newly refurbished Hamptons, natural light, balcony",
    views: "Lake",
    capacityCocktail: 60,
    capacityBanquet: 40,
    capacityTheatre: 50,
    bestFor: "Seated lunches, talks, workshops, smaller group dinners",
  },
  {
    name: "Lakeside Cabanas",
    style: "Outdoor, intimate",
    views: "Lake",
    capacityCocktail: 20,
    capacityBanquet: 12,
    capacityTheatre: null,
    bestFor: "Picnics, intimate gatherings, 8–12 person bespoke experiences",
  },
  {
    name: "Patio",
    style: "Covered outdoor",
    views: "Lake",
    capacityCocktail: 50,
    capacityBanquet: 36,
    capacityTheatre: null,
    bestFor: "Lakeside lunches, larger casual gatherings",
  },
] as const;

const FB_VENUE_SEEDS = [
  {
    name: "The Beachie (Bistro)",
    type: "Pub/bistro",
    style: "Casual, elevated pub classics",
    capacity: 180,
    notes: "Uses Sevenrooms; buzzer system per management response on TripAdvisor",
    costPerHeadBreakfastCents: 2200,
    costPerHeadLunchCents: 3200,
    costPerHeadDinner2cCents: 4900,
    costPerHeadDinner3cCents: 6500,
    costPerHeadCanapesCents: 3800,
    beveragePackageOptions: {
      "2hr_house": 3500,
      "3hr_house": 4500,
      "2hr_premium": 5500,
      "3hr_premium": 6900,
    },
  },
  {
    name: "Pelicans Restaurant",
    type: "Restaurant",
    style: "Elevated, seafood-focused, lake-facing",
    capacity: 90,
    notes: "Premium F&B venue",
    costPerHeadBreakfastCents: 2900,
    costPerHeadLunchCents: 4500,
    costPerHeadDinner2cCents: 6900,
    costPerHeadDinner3cCents: 8900,
    costPerHeadCanapesCents: 5500,
    beveragePackageOptions: {
      "2hr_house": 4500,
      "3hr_house": 5900,
      "2hr_premium": 6900,
      "3hr_premium": 8500,
    },
  },
  {
    name: "Pool Club / Poolside Bar",
    type: "Outdoor bar",
    style: "Casual lakeside",
    capacity: 60,
    notes: "Weather-dependent",
    costPerHeadBreakfastCents: null,
    costPerHeadLunchCents: 2900,
    costPerHeadDinner2cCents: null,
    costPerHeadDinner3cCents: null,
    costPerHeadCanapesCents: 3500,
    beveragePackageOptions: {
      "2hr_house": 3200,
      "3hr_house": 4200,
    },
  },
] as const;

const REGULAR_PROGRAMMING_SEEDS = [
  {
    event: "Poker Tournament",
    frequency: "monthly" as const,
    dayOfWeek: "Thursday",
    time: "19:00:00",
    venue: "Bar area",
    impactNotes: "Avoid scheduling competing quiet events that night",
  },
  {
    event: "Pool Comp",
    frequency: "weekly" as const,
    dayOfWeek: "Thursday",
    time: "19:00:00",
    venue: "Bar area",
    impactNotes: "Avoid clashing quiet evening events Thursdays",
  },
  {
    event: "Live Soloist",
    frequency: "weekly" as const,
    dayOfWeek: "Friday",
    time: "19:30:00",
    venue: "Bistro",
    impactNotes: "Not midweek; no impact",
  },
  {
    event: "Live Soloist (Sunday)",
    frequency: "weekly" as const,
    dayOfWeek: "Sunday",
    time: "16:00:00",
    venue: "Bistro",
    impactNotes: "Not midweek; no impact",
  },
  {
    event: "Saturday Sessions",
    frequency: "weekly" as const,
    dayOfWeek: "Saturday",
    time: "19:00:00",
    venue: "Bistro",
    impactNotes: "Not midweek; no impact",
  },
  {
    event: "Wedding Showcase",
    frequency: "annual" as const,
    dayOfWeek: null,
    time: null,
    venue: "Multiple spaces",
    impactNotes: "Blocks function space on showcase date",
  },
] as const;

const LOCAL_POI_SEEDS = [
  { name: "Toukley Golf Club", distanceMin: 5, notes: "18-hole, walkable from hotel" },
  { name: "Soldiers Beach", distanceMin: 5, notes: "Patrolled surf beach" },
  { name: "The Entrance", distanceMin: 13, notes: "Pelican feeding daily 3:30pm" },
  { name: "Tuggerah Lake", distanceMin: 8, notes: "Fishing, kayaking" },
  { name: "Wyrrabalong National Park", distanceMin: 12, notes: "Coastal walks, lookouts" },
  { name: "Norah Head Lighthouse", distanceMin: 15, notes: "Historic, tours available" },
  { name: "Pelican Plaza", distanceMin: 2, notes: "Local shopping precinct" },
] as const;

const TARGET_POSTCODE_SEEDS = [
  // Western Sydney (Hills) — 90min, high affluence
  { region: "western_sydney" as const, postcode: "2153", suburbs: "Baulkham Hills", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2154", suburbs: "Castle Hill", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2155", suburbs: "Kellyville", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2156", suburbs: "Kenthurst, Glenhaven", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2157", suburbs: "Dural", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2118", suburbs: "Carlingford", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2119", suburbs: "Beecroft, Cheltenham", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2120", suburbs: "Pennant Hills, Thornleigh", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2121", suburbs: "Epping", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2125", suburbs: "West Pennant Hills", driveTimeMin: 90, retireeDensity: "High, affluent" },
  { region: "western_sydney" as const, postcode: "2126", suburbs: "Cherrybrook", driveTimeMin: 90, retireeDensity: "High, affluent" },
  // North Shore — 75min
  { region: "north_shore" as const, postcode: "2076", suburbs: "Wahroonga", driveTimeMin: 75, retireeDensity: "High, affluent" },
  { region: "north_shore" as const, postcode: "2077", suburbs: "Hornsby", driveTimeMin: 75, retireeDensity: "High, affluent" },
  { region: "north_shore" as const, postcode: "2074", suburbs: "Turramurra", driveTimeMin: 75, retireeDensity: "High, affluent" },
  { region: "north_shore" as const, postcode: "2075", suburbs: "St Ives", driveTimeMin: 75, retireeDensity: "High, affluent" },
  // Newcastle / Lake Macquarie — 60–75min
  { region: "newcastle_lake_macquarie" as const, postcode: "2280", suburbs: "Belmont", driveTimeMin: 60, retireeDensity: "High, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2281", suburbs: "Swansea, Caves Beach", driveTimeMin: 60, retireeDensity: "High, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2282", suburbs: "Valentine, Eleebana", driveTimeMin: 65, retireeDensity: "High, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2283", suburbs: "Bonnells Bay", driveTimeMin: 60, retireeDensity: "Mid, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2284", suburbs: "Cardiff, Edgeworth", driveTimeMin: 70, retireeDensity: "Mid, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2285", suburbs: "Glendale, Argenton", driveTimeMin: 70, retireeDensity: "Mid, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2289", suburbs: "Adamstown Heights", driveTimeMin: 75, retireeDensity: "High, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2290", suburbs: "Charlestown", driveTimeMin: 70, retireeDensity: "High, mixed affluence" },
  { region: "newcastle_lake_macquarie" as const, postcode: "2291", suburbs: "Merewether, The Hill", driveTimeMin: 75, retireeDensity: "High, affluent" },
] as const;

// ── Pre-flight invariants ───────────────────────────────────────────────────
function assertInvariants() {
  const total = ROOM_TYPE_SEEDS.reduce((sum, r) => sum + r.count, 0);
  if (total !== SEED_TOTAL_ROOMS) {
    throw new Error(
      `Seed invariant violated: room counts sum to ${total}, expected ${SEED_TOTAL_ROOMS}. ` +
        `Adjust ROOM_TYPE_SEEDS counts in scripts/seed-property.ts.`,
    );
  }
  console.log(`✓ Room counts sum to ${SEED_TOTAL_ROOMS}`);
}

// ── Seed runners — all idempotent ───────────────────────────────────────────
async function seedSingletons() {
  await db
    .insert(schema.propertyProfile)
    .values({
      id: 1,
      name: "The Beachcomber Hotel & Resort",
      nickname: "The Beachie",
      address: "200 Main Rd, Toukley NSW 2263",
      phone: "(02) 4317 2845",
      email: "hello@beachcomberhotelandresort.com.au",
      brandCollection: "Ascend Collection (Choice Hotels)",
      totalRooms: SEED_TOTAL_ROOMS,
      style: "Hamptons-inspired, waterfront, iconic local",
      setting: "Waterfront on Budgewoi Lake, Central Coast NSW",
      distanceSydneyCbdMin: 90,
      distanceNewcastleMin: 60,
      tagline: "Life's Peachy at The Beachie",
      website: "beachcomberhotelandresort.com.au",
      instagram: "@thebeachie",
      facebook: "TheBeachie",
      bookingEngineInternal: "Choice Hotels (CentralCommand)",
      eventBookingSystem: "iVvy",
      restaurantBookingSystem: "Sevenrooms",
      pms: "RMS Cloud",
      isPlaceholder: true,
    })
    .onConflictDoNothing({ target: schema.propertyProfile.id });

  await db
    .insert(schema.brandVoice)
    .values({
      id: 1,
      version: 1,
      reviewedByManager: false,
      rules: {
        warm_local_unpretentious: true,
        lightly_cheeky_aussie: true,
        anchors: ["Hamptons-inspired", "waterfront", "iconic local"],
        signature_phrases: [
          "Life's Peachy",
          "Pick your oasis",
          "Eat, Drink, Play + Stay",
          "arvo",
          "lakeside",
        ],
      },
      guideMarkdown:
        "PLACEHOLDER — to be drafted from website and Facebook page during onboarding. Indicative: warm, locally proud, lightly cheeky in an Aussie way, unpretentious. Anchors around the Hamptons-inspired/waterfront/iconic-local identity. Never luxury-speak. Never wellness-jargon. Never corporate.",
      forbiddenPhrases: [
        "world-class",
        "luxury experience",
        "wellness sanctuary",
        "elevated journey",
      ],
      requiredPhrasesPerContext: {
        rsa: "Please drink responsibly.",
        mobility_friendly:
          "Ground floor, walk-in shower, close to lifts and parking.",
      },
      isPlaceholder: true,
    })
    .onConflictDoNothing({ target: schema.brandVoice.id });

  await db
    .insert(schema.operationalConstants)
    .values({
      id: 1,
      blackoutDates: [],
      rateFloorsCents: {},
      rateCeilingsCents: {},
      accessibilityNotes:
        "Only rooms flagged is_accessible=true may be described as wheelchair accessible. Mobility-friendly rooms use the approved phrase only.",
      mobilityFriendlyApprovedPhrase:
        "Ground floor, walk-in shower, close to lifts and parking.",
      choiceHotelsBrandNotes:
        "PLACEHOLDER — manager to upload Ascend Collection brand standards during onboarding. Until then, generation flags an audit entry.",
      brandVoiceScoreThreshold: 70,
      isPlaceholder: true,
    })
    .onConflictDoNothing({ target: schema.operationalConstants.id });

  console.log("✓ Singletons seeded");
}

async function seedRoomTypes() {
  for (const seed of ROOM_TYPE_SEEDS) {
    await db
      .insert(schema.roomTypes)
      .values({ ...seed, isPlaceholder: true })
      .onConflictDoNothing({ target: schema.roomTypes.name });
  }
  console.log(`✓ ${ROOM_TYPE_SEEDS.length} room types seeded`);
}

async function seedFunctionSpaces() {
  for (const seed of FUNCTION_SPACE_SEEDS) {
    await db
      .insert(schema.functionSpaces)
      .values({ ...seed, isPlaceholder: true })
      .onConflictDoNothing({ target: schema.functionSpaces.name });
  }
  console.log(`✓ ${FUNCTION_SPACE_SEEDS.length} function spaces seeded`);
}

async function seedFbVenues() {
  for (const seed of FB_VENUE_SEEDS) {
    await db
      .insert(schema.fbVenues)
      .values({ ...seed, isPlaceholder: true })
      .onConflictDoNothing({ target: schema.fbVenues.name });
  }
  console.log(`✓ ${FB_VENUE_SEEDS.length} F&B venues seeded`);
}

async function seedRegularProgramming() {
  // Composite uniqueness: (event, dayOfWeek) — handled by checking existence
  // rather than ON CONFLICT since there's no DB-level unique index for this.
  for (const seed of REGULAR_PROGRAMMING_SEEDS) {
    const existing = await db
      .select({ id: schema.regularProgramming.id })
      .from(schema.regularProgramming)
      .where(sql`event = ${seed.event}`)
      .limit(1);
    if (existing.length > 0) continue;
    await db
      .insert(schema.regularProgramming)
      .values({ ...seed, isPlaceholder: true });
  }
  console.log(`✓ ${REGULAR_PROGRAMMING_SEEDS.length} regular programming entries seeded`);
}

async function seedLocalPois() {
  for (const seed of LOCAL_POI_SEEDS) {
    await db
      .insert(schema.localContextPois)
      .values({ ...seed, isPlaceholder: true })
      .onConflictDoNothing({ target: schema.localContextPois.name });
  }
  console.log(`✓ ${LOCAL_POI_SEEDS.length} local POIs seeded`);
}

async function seedTargetPostcodes() {
  for (const seed of TARGET_POSTCODE_SEEDS) {
    await db
      .insert(schema.targetPostcodes)
      .values({ ...seed, isPlaceholder: true })
      .onConflictDoNothing({ target: schema.targetPostcodes.postcode });
  }
  console.log(`✓ ${TARGET_POSTCODE_SEEDS.length} target postcodes seeded`);
}

async function seedSystemSettings() {
  await db
    .insert(schema.systemSettings)
    .values({
      id: 1,
      generationPaused: false,
      cronPaused: false,
      onDemandPaused: false,
      productionMode: false, // §3.1 — defaults to TEST mode
      monthlyBudgetCents: 35000, // USD $350 default, see PLAN.md §14
    })
    .onConflictDoNothing({ target: schema.systemSettings.id });
  console.log("✓ system_settings seeded (production_mode=false)");
}

async function main() {
  console.log("Seeding property knowledge base…");
  console.log("");
  assertInvariants();
  console.log("");
  await seedSingletons();
  await seedRoomTypes();
  await seedFunctionSpaces();
  await seedFbVenues();
  await seedRegularProgramming();
  await seedLocalPois();
  await seedTargetPostcodes();
  await seedSystemSettings();
  console.log("");
  console.log("Done. All rows seeded with is_placeholder=true.");
  console.log("Manager edits in the admin UI will flip the flag to false.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
