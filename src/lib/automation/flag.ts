export function isAutomationEngineEnabled(): boolean {
  const v = process.env.FEATURE_AUTOMATION_ENGINE;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

export const SEED_AGENTS: {
  slug: string;
  name: string;
  moduleIds: string[];
  description: string;
  sortOrder: number;
}[] = [
  {
    slug: "revenue",
    name: "Revenue Agent™",
    moduleIds: ["revenue", "conversion"],
    description: "Monetization, capture, and conversion opportunities.",
    sortOrder: 10,
  },
  {
    slug: "marketing",
    name: "Marketing Agent™",
    moduleIds: ["marketing", "content"],
    description: "Campaigns, nurture, content, and demand gen.",
    sortOrder: 20,
  },
  {
    slug: "seo",
    name: "SEO Agent™",
    moduleIds: ["seo", "authority"],
    description: "Discovery, SEO, and authority gaps.",
    sortOrder: 30,
  },
  {
    slug: "trust",
    name: "Trust Agent™",
    moduleIds: ["trust"],
    description: "Proof, reviews, and credibility gaps.",
    sortOrder: 40,
  },
  {
    slug: "automation",
    name: "Automation Agent™",
    moduleIds: ["automation"],
    description: "Internal and ops automation opportunities.",
    sortOrder: 50,
  },
  {
    slug: "developer",
    name: "Developer Agent™",
    moduleIds: [],
    description: "Stack-aware implementation via Project Memory™.",
    sortOrder: 60,
  },
  {
    slug: "analytics",
    name: "Analytics Agent™",
    moduleIds: ["ai"],
    description: "Measurement, insight, and analytics gaps.",
    sortOrder: 70,
  },
];

export type AgentSlug =
  | "revenue"
  | "marketing"
  | "seo"
  | "trust"
  | "automation"
  | "developer"
  | "analytics";

export function agentSlugForModule(moduleId: string | null | undefined): AgentSlug {
  const m = (moduleId ?? "").toLowerCase();
  for (const a of SEED_AGENTS) {
    if (a.moduleIds.includes(m)) return a.slug as AgentSlug;
  }
  if (m === "customer") return "marketing";
  if (m === "competitive") return "seo";
  return "automation";
}
