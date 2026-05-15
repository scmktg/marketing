// 14-step onboarding flow per brief §6 and PLAN.md §10.
// Each step is rendered at /onboarding/[step] (where step is the slug).
// Steps marked deferred=true land later in their respective PRs but appear
// in the stepper for completeness.

export type HardGate = "rooms" | "voice" | "photos";

export type OnboardingStep = {
  num: number;
  slug: string;
  label: string;
  description: string;
  /** Optional — the knowledge table this step edits. The page composes the
   *  knowledge CRUD pages or directs the manager to them. */
  knowledgeSlug?: string;
  /** If set, this step IS a hard gate from PLAN.md §10. */
  hardGate?: HardGate;
  /** v1 stub — feature lands in a later PR. The page renders an explanatory
   *  card with the eventual home for the work and a "Mark step done" button. */
  deferred?: boolean;
  /** If true, manager can mark this step done manually (acknowledgement of
   *  a non-gated step). Stored in system_settings.onboarding_completed_steps. */
  manuallyAcknowledgeable?: boolean;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    num: 1,
    slug: "users",
    label: "Team accounts",
    description:
      "Confirm the manager account exists. Add marketing team accounts later from Settings.",
    deferred: true,
    manuallyAcknowledgeable: true,
  },
  {
    num: 2,
    slug: "property-profile",
    label: "Property profile",
    description:
      "Confirm the property's high-level facts. Pre-seeded from public sources.",
    knowledgeSlug: "property-profile",
  },
  {
    num: 3,
    slug: "room-types",
    label: "Rooms & midweek rates",
    description:
      "Enter the count and standard midweek rate range for every room type. Sum must equal 83.",
    knowledgeSlug: "room-types",
    hardGate: "rooms",
  },
  {
    num: 4,
    slug: "mobility",
    label: "Mobility-friendly rooms",
    description:
      "Per room type, set how many are ground-floor, walk-in-shower, or otherwise mobility-friendly.",
    knowledgeSlug: "room-types",
    manuallyAcknowledgeable: true,
  },
  {
    num: 5,
    slug: "function-spaces",
    label: "Function spaces",
    description:
      "Enter cocktail, banquet, and theatre capacities for each space. Pull from the iVvy event packs.",
    knowledgeSlug: "function-spaces",
  },
  {
    num: 6,
    slug: "fb-venues",
    label: "F&B cost-per-head benchmarks",
    description:
      "Enter cost-per-head for breakfast, lunch, 2- and 3-course dinner, canapés, and beverage packages.",
    knowledgeSlug: "fb-venues",
  },
  {
    num: 7,
    slug: "regular-programming",
    label: "Regular programming",
    description:
      "Confirm recurring weekly/monthly events the system must work around.",
    knowledgeSlug: "regular-programming",
  },
  {
    num: 8,
    slug: "photos",
    label: "Photo library",
    description:
      "Upload at least 40 photos across rooms, lake, grounds, food, function spaces, and brand details.",
    knowledgeSlug: "photo-library",
    hardGate: "photos",
  },
  {
    num: 9,
    slug: "marketing-materials",
    label: "Existing marketing materials",
    description:
      "Upload existing marketing assets — the system uses them to draft the brand voice guide.",
    deferred: true,
    manuallyAcknowledgeable: true,
  },
  {
    num: 10,
    slug: "brand-voice",
    label: "Brand voice review",
    description:
      "Review and edit the AI-drafted brand voice guide. Generation refuses until you tick 'reviewed'.",
    knowledgeSlug: "brand-voice",
    hardGate: "voice",
  },
  {
    num: 11,
    slug: "partners",
    label: "Partner CRM seed",
    description: "Seed the partner CRM with 30–50 known contacts (hairdressers, GPs, Probus clubs).",
    deferred: true,
    manuallyAcknowledgeable: true,
  },
  {
    num: 12,
    slug: "talent",
    label: "Third-party talent",
    description: "Confirm existing musicians, instructors, artists for the talent database.",
    knowledgeSlug: "talent-database",
    manuallyAcknowledgeable: true,
  },
  {
    num: 13,
    slug: "operational-settings",
    label: "Operational constants",
    description:
      "Blackout dates, rate floors/ceilings, accessibility phrases, brand standards notes.",
    knowledgeSlug: "operational-constants",
  },
  {
    num: 14,
    slug: "api-keys",
    label: "API keys & budget cap",
    description:
      "Confirm OPENAI_API_KEY and monthly USD cap. Set on the Vercel env config; cap enforced by lib/ai/client.ts.",
    deferred: true,
    manuallyAcknowledgeable: true,
  },
];

export function getStep(slug: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.slug === slug);
}

export const HARD_GATE_STEPS = ONBOARDING_STEPS.filter((s) => s.hardGate);
