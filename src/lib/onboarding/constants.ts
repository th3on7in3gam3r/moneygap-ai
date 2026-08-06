import type { CopilotMode, OnboardingPersonaRole } from "@/db/schema";

export const ONBOARDING_STEPS = [
  "welcome",
  "website",
  "profile",
  "role",
  "integrations",
  "scan",
  "results",
  "complete",
] as const;

export const PERSONA_OPTIONS: {
  id: OnboardingPersonaRole;
  label: string;
  description: string;
}[] = [
  { id: "founder", label: "Founder", description: "Building and growing the business." },
  { id: "ceo", label: "CEO", description: "Priorities, ROI, and strategy." },
  { id: "developer", label: "Developer", description: "Implementation and shipping." },
  { id: "marketing", label: "Marketing", description: "Demand, content, and trust." },
  { id: "sales", label: "Sales", description: "Pipeline and conversion." },
  { id: "agency", label: "Agency", description: "Client portfolio growth." },
  { id: "consultant", label: "Consultant", description: "Advisory and delivery." },
  { id: "operations", label: "Operations", description: "Process and scale." },
];

export const GOAL_OPTIONS: {
  id: string;
  label: string;
  goalType:
    | "revenue"
    | "seo"
    | "leads"
    | "conversions"
    | "authority"
    | "custom"
    | "subscribers";
}[] = [
  { id: "increase_revenue", label: "Increase sales", goalType: "revenue" },
  { id: "generate_leads", label: "Generate more leads", goalType: "leads" },
  { id: "improve_seo", label: "Improve SEO", goalType: "seo" },
  { id: "improve_conversion", label: "Improve conversions", goalType: "conversions" },
  {
    id: "improve_ai_visibility",
    label: "Increase AI visibility",
    goalType: "custom",
  },
  {
    id: "grow_brand_authority",
    label: "Grow brand authority",
    goalType: "authority",
  },
  { id: "build_trust", label: "Build Trust", goalType: "authority" },
  { id: "reduce_churn", label: "Reduce Churn", goalType: "custom" },
  { id: "improve_performance", label: "Improve Website Performance", goalType: "custom" },
];

export function personaToCopilotMode(role: OnboardingPersonaRole | null | undefined): CopilotMode {
  switch (role) {
    case "developer":
      return "developer";
    case "marketing":
    case "sales":
      return "marketing";
    case "agency":
    case "consultant":
      return "agency";
    case "founder":
    case "ceo":
    case "operations":
    default:
      return "ceo";
  }
}

export const ONBOARDING_INTEGRATION_SLUGS = [
  "google_analytics",
  "google_search_console",
  "github",
  "vercel",
  "stripe",
  "hubspot",
  "cloudflare_pages",
  "mailchimp",
  "resend",
] as const;
