/** Client-safe plan catalog (no DB imports). */

export type PlanId =
  | "free"
  | "starter"
  | "growth"
  | "professional"
  | "agency"
  | "enterprise";

export type FeatureKey =
  | "moneygap_engine"
  | "ai_advisor"
  | "action_center"
  | "monitor"
  | "competitor_intelligence"
  | "white_label_reports"
  | "agency_workspace"
  | "api_access"
  | "team_members"
  | "scheduled_reports"
  | "opportunity_intelligence";

export type PlanLimitsJson = {
  maxClients: number;
  maxSeats: number;
  maxWebsites: number;
  analysesPerMonth: number;
  aiGenerationsPerMonth: number;
  reportsPerMonth: number;
  competitorAnalysesPerMonth: number;
  exportsPerMonth: number;
  apiCallsPerMonth: number;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  sortOrder: number;
  limits: PlanLimitsJson;
  features: FeatureKey[];
};

const UNLIMITED = 999_999;

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    description: "Explore MoneyGap reports and discover opportunities.",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    sortOrder: 0,
    limits: {
      maxClients: 0,
      maxSeats: 1,
      maxWebsites: 1,
      analysesPerMonth: 2,
      aiGenerationsPerMonth: 3,
      reportsPerMonth: 2,
      competitorAnalysesPerMonth: 0,
      exportsPerMonth: 2,
      apiCallsPerMonth: 100,
    },
    features: ["moneygap_engine", "api_access"],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For founders validating where revenue leaks begin.",
    monthlyPriceCents: 4900,
    annualPriceCents: 49000,
    sortOrder: 1,
    limits: {
      maxClients: 0,
      maxSeats: 2,
      maxWebsites: 2,
      analysesPerMonth: 10,
      aiGenerationsPerMonth: 20,
      reportsPerMonth: 10,
      competitorAnalysesPerMonth: 2,
      exportsPerMonth: 10,
      apiCallsPerMonth: 250,
    },
    features: ["moneygap_engine", "monitor", "team_members", "api_access"],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Full implementation toolkit for growing teams.",
    monthlyPriceCents: 14900,
    annualPriceCents: 149000,
    sortOrder: 2,
    limits: {
      maxClients: 0,
      maxSeats: 5,
      maxWebsites: 5,
      analysesPerMonth: 40,
      aiGenerationsPerMonth: 100,
      reportsPerMonth: 40,
      competitorAnalysesPerMonth: 20,
      exportsPerMonth: 40,
      apiCallsPerMonth: 1_000,
    },
    features: [
      "moneygap_engine",
      "ai_advisor",
      "action_center",
      "monitor",
      "competitor_intelligence",
      "team_members",
      "api_access",
      "opportunity_intelligence",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Higher limits plus scheduled growth reports.",
    monthlyPriceCents: 29900,
    annualPriceCents: 299000,
    sortOrder: 3,
    limits: {
      maxClients: 3,
      maxSeats: 10,
      maxWebsites: 15,
      analysesPerMonth: 100,
      aiGenerationsPerMonth: 300,
      reportsPerMonth: 100,
      competitorAnalysesPerMonth: 50,
      exportsPerMonth: 100,
      apiCallsPerMonth: 2_000,
    },
    features: [
      "moneygap_engine",
      "ai_advisor",
      "action_center",
      "monitor",
      "competitor_intelligence",
      "team_members",
      "scheduled_reports",
      "api_access",
      "opportunity_intelligence",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    description: "Multi-client agency workspace with white-label reports.",
    monthlyPriceCents: 49900,
    annualPriceCents: 499000,
    sortOrder: 4,
    limits: {
      maxClients: 50,
      maxSeats: 15,
      maxWebsites: 100,
      analysesPerMonth: 200,
      aiGenerationsPerMonth: 600,
      reportsPerMonth: 200,
      competitorAnalysesPerMonth: 100,
      exportsPerMonth: 200,
      apiCallsPerMonth: 5_000,
    },
    features: [
      "moneygap_engine",
      "ai_advisor",
      "action_center",
      "monitor",
      "competitor_intelligence",
      "white_label_reports",
      "agency_workspace",
      "team_members",
      "scheduled_reports",
      "api_access",
      "opportunity_intelligence",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Highest limits with API access and enterprise controls.",
    monthlyPriceCents: 99900,
    annualPriceCents: 999000,
    sortOrder: 5,
    limits: {
      maxClients: 500,
      maxSeats: 100,
      maxWebsites: UNLIMITED,
      analysesPerMonth: UNLIMITED,
      aiGenerationsPerMonth: UNLIMITED,
      reportsPerMonth: UNLIMITED,
      competitorAnalysesPerMonth: UNLIMITED,
      exportsPerMonth: UNLIMITED,
      apiCallsPerMonth: 10_000,
    },
    features: [
      "moneygap_engine",
      "ai_advisor",
      "action_center",
      "monitor",
      "competitor_intelligence",
      "white_label_reports",
      "agency_workspace",
      "api_access",
      "team_members",
      "scheduled_reports",
      "opportunity_intelligence",
    ],
  },
];

export function resolvePlanId(plan: string): PlanId {
  if (plan === "small_agency" || plan === "growth_agency") return "agency";
  if (plan === "scale") return "enterprise";
  if (PLAN_CATALOG.some((p) => p.id === plan)) return plan as PlanId;
  return "free";
}

export function getPlanDefinition(planId: string): PlanDefinition {
  const id = resolvePlanId(planId);
  return PLAN_CATALOG.find((p) => p.id === id) ?? PLAN_CATALOG[0]!;
}
