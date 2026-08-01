import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  automationMarketplaceTemplates,
  automationWorkflows,
  type AutomationWorkflowKind,
  type AutomationWorkflowSteps,
} from "@/db/schema";

const SEED_TEMPLATES: {
  slug: string;
  name: string;
  kind: AutomationWorkflowKind;
  agentSlug: string;
  description: string;
  steps: AutomationWorkflowSteps;
  sortOrder: number;
}[] = [
  {
    slug: "lead-nurture-email",
    name: "Lead nurture email sequence",
    kind: "nurture",
    agentSlug: "marketing",
    description: "Draft 5-touch nurture for new leads (no auto-send).",
    sortOrder: 10,
    steps: {
      kind: "nurture",
      summary: "Curated nurture template — install creates a draft workflow.",
      steps: [
        { id: "1", title: "Segment leads", detail: "Define entry criteria" },
        { id: "2", title: "Write 5 emails", detail: "Draft only in ESP" },
        { id: "3", title: "Human approve", detail: "Review before any send" },
        { id: "4", title: "Measure opens/replies", detail: "Analytics Agent follow-up" },
      ],
    },
  },
  {
    slug: "review-request",
    name: "Review request loop",
    kind: "reviews",
    agentSlug: "trust",
    description: "Ask happy customers for reviews after delivery.",
    sortOrder: 20,
    steps: {
      kind: "reviews",
      summary: "Trust-building review request workflow (draft).",
      steps: [
        { id: "1", title: "Identify happy customers", detail: "Recent NPS/completed jobs" },
        { id: "2", title: "Draft request email", detail: "Personal, short" },
        { id: "3", title: "Publish reviews on site", detail: "After permission" },
      ],
    },
  },
  {
    slug: "crm-lead-capture",
    name: "CRM lead capture stages",
    kind: "crm",
    agentSlug: "revenue",
    description: "Map new leads into CRM stages without live sync.",
    sortOrder: 30,
    steps: {
      kind: "crm",
      summary: "CRM stage design draft.",
      steps: [
        { id: "1", title: "Define stages", detail: "New → Qualified → Won" },
        { id: "2", title: "Map form fields", detail: "UTM + contact" },
        { id: "3", title: "Owner assignment rules", detail: "Manual review first" },
      ],
    },
  },
  {
    slug: "customer-onboarding",
    name: "Customer onboarding checklist",
    kind: "onboarding",
    agentSlug: "automation",
    description: "Internal onboarding tasks for new customers.",
    sortOrder: 40,
    steps: {
      kind: "onboarding",
      summary: "Onboarding automation draft.",
      steps: [
        { id: "1", title: "Welcome pack", detail: "Draft assets" },
        { id: "2", title: "Kickoff call task", detail: "Assign owner" },
        { id: "3", title: "Day-7 check-in", detail: "Manual reminder" },
      ],
    },
  },
  {
    slug: "internal-seo-tasks",
    name: "Internal SEO task automation",
    kind: "internal",
    agentSlug: "seo",
    description: "Recurring SEO hygiene checklist as Action Project.",
    sortOrder: 50,
    steps: {
      kind: "internal",
      summary: "SEO hygiene internal workflow.",
      steps: [
        { id: "1", title: "Crawl key pages", detail: "Titles/meta" },
        { id: "2", title: "Fix broken links", detail: "Priority list" },
        { id: "3", title: "Update sitemap", detail: "After publish" },
      ],
    },
  },
];

export async function ensureMarketplaceTemplates() {
  const existing = await db.query.automationMarketplaceTemplates.findMany();
  if (existing.length >= SEED_TEMPLATES.length) return existing;
  for (const t of SEED_TEMPLATES) {
    if (existing.some((e) => e.slug === t.slug)) continue;
    await db.insert(automationMarketplaceTemplates).values(t);
  }
  return db.query.automationMarketplaceTemplates.findMany({
    orderBy: [asc(automationMarketplaceTemplates.sortOrder)],
  });
}

export async function listMarketplaceTemplates() {
  await ensureMarketplaceTemplates();
  return db.query.automationMarketplaceTemplates.findMany({
    where: eq(automationMarketplaceTemplates.status, "active"),
    orderBy: [asc(automationMarketplaceTemplates.sortOrder)],
  });
}

export async function installMarketplaceTemplate(input: {
  workspaceId: string;
  slug: string;
}) {
  await ensureMarketplaceTemplates();
  const template = await db.query.automationMarketplaceTemplates.findFirst({
    where: eq(automationMarketplaceTemplates.slug, input.slug),
  });
  if (!template) {
    return { ok: false as const, error: "Template not found", status: 404 as const };
  }
  const [workflow] = await db
    .insert(automationWorkflows)
    .values({
      workspaceId: input.workspaceId,
      agentSlug: template.agentSlug,
      title: template.name,
      kind: template.kind,
      steps: template.steps,
      status: "draft",
      meta: { fromTemplate: template.slug },
    })
    .returning();
  return { ok: true as const, workflow: workflow! };
}
