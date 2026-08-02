import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  websites,
  type DeveloperBlueprintTool,
  type OpportunityFix,
  type TechStackProfile,
} from "@/db/schema";
import { IDE_PROMPT_TOOLS } from "@/lib/developer/blueprints";
import { getTechProfile } from "@/lib/developer/memory";

export type IdePromptOpportunity = {
  id: string;
  reportId: string;
  title: string;
  category: string;
  moduleId: string;
  summary: string | null;
  whatsMissing: string;
  whyItMatters: string;
  businessImpact: string;
  difficulty: string;
  estimatedTime: string | null;
  opportunityIndex: number;
  estimatedAnnualRevenue: number | null;
  fixes: OpportunityFix[] | null;
};

export type IdePromptWebsite = {
  id: string;
  name: string;
  domain: string;
  url: string;
};

export type IdePromptItem = {
  tool: DeveloperBlueprintTool;
  title: string;
  intro: string;
  body: string;
};

function stackSummary(stack?: TechStackProfile | null): string | null {
  if (!stack) return null;
  const layers = [
    stack.frontend,
    stack.backend,
    stack.database,
    stack.orm,
    stack.auth,
    stack.hosting,
  ].filter(Boolean);
  if (!layers.length) return null;
  return layers.join(" / ");
}

function stackBlock(stack?: TechStackProfile | null): string {
  if (!stack) {
    return "Stack: unknown (optional — connect GitHub in Developer Mode / Project Memory™ later).";
  }
  const lines = [
    ["Frontend", stack.frontend],
    ["Backend", stack.backend],
    ["Database", stack.database],
    ["ORM", stack.orm],
    ["Auth", stack.auth],
    ["Hosting", stack.hosting],
    ["Styling", stack.styling],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`);
  return `Detected stack (Project Memory™):\n${lines.join("\n") || "- (empty)"}\nConfidence: ${stack.confidence}%`;
}

function fixPlanBlock(fixes: OpportunityFix[] | null | undefined): string {
  if (!fixes?.length) return "Fix plan: (none listed — propose a minimal, reviewable change.)";
  return [
    "Suggested fix actions (from MoneyGap Fix Plan):",
    ...fixes.slice(0, 8).map(
      (f) =>
        `- [${f.tier}] ${f.action} (difficulty: ${f.difficulty}, time: ${f.estimatedTime})`,
    ),
  ].join("\n");
}

export function buildIdePrompts(input: {
  opportunity: IdePromptOpportunity;
  website?: IdePromptWebsite | null;
  stack?: TechStackProfile | null;
}): IdePromptItem[] {
  const o = input.opportunity;
  const site = input.website;
  const impact =
    o.estimatedAnnualRevenue != null && o.estimatedAnnualRevenue > 0
      ? `Estimated annual impact (AI Estimate): $${o.estimatedAnnualRevenue.toLocaleString()} — not a guarantee.`
      : "Impact: treat figures as AI Estimate only — never claim guaranteed ROI.";

  const websiteBlock = site
    ? [
        "Website (apply this fix for this site only):",
        `- Name: ${site.name}`,
        `- Domain: ${site.domain}`,
        `- URL: ${site.url}`,
        "",
      ].join("\n")
    : "Website: (unknown — confirm which site this MoneyGap belongs to before implementing.)\n\n";

  const problemBlock = [
    `# MoneyGap problem: ${o.title}`,
    "",
    websiteBlock,
    `Category: ${o.category} | Module: ${o.moduleId}`,
    `Difficulty: ${o.difficulty}${o.estimatedTime ? ` | Est. time: ${o.estimatedTime}` : ""}`,
    `Opportunity Index™: ${o.opportunityIndex}`,
    "",
    "What's missing:",
    o.whatsMissing,
    "",
    o.summary ? `Summary:\n${o.summary}\n` : "",
    "Why it matters:",
    o.whyItMatters,
    "",
    "Business impact:",
    o.businessImpact,
    "",
    impact,
    "",
    fixPlanBlock(o.fixes),
    "",
    stackBlock(input.stack),
    "",
    "Your task:",
    "Implement a minimal, reviewable solution that addresses this MoneyGap in the existing codebase.",
    "Prefer small diffs that match project conventions.",
    "",
    "Constraints:",
    "- Drafts only — do not auto-publish to CRM, email, or production without human review.",
    "- Do not push or merge to main/master; use a feature branch if opening a PR.",
    "- Soft-fail optional integrations; do not rewrite MoneyGap Score™ or Opportunity Index™.",
    "- Label any revenue/traffic claims as AI Estimate.",
  ]
    .filter(Boolean)
    .join("\n");

  return IDE_PROMPT_TOOLS.map((t) => {
    let body = [`${t.intro}`, "", problemBlock].join("\n");
    if (t.tool === "copilot") {
      body +=
        "\n\nIn Copilot Chat: @workspace implement a small, reviewable fix for the problem above.";
    }
    if (t.tool === "lovable" || t.tool === "bolt") {
      body +=
        "\n\nUI focus: ship an on-brand surface for social proof / the gap above. Follow the product visual system — avoid generic purple templates.";
    }
    return {
      tool: t.tool,
      title: t.title,
      intro: t.intro,
      body,
    };
  });
}

export async function loadOpportunityForIdePrompt(
  opportunityId: string,
): Promise<IdePromptOpportunity | null> {
  try {
    const row = await db.query.moneyGapOpportunities.findFirst({
      where: eq(moneyGapOpportunities.id, opportunityId),
    });
    if (!row) return null;
    return {
      id: row.id,
      reportId: row.reportId,
      title: row.title,
      category: row.category,
      moduleId: row.moduleId,
      summary: row.summary,
      whatsMissing: row.whatsMissing,
      whyItMatters: row.whyItMatters,
      businessImpact: row.businessImpact,
      difficulty: row.difficulty,
      estimatedTime: row.estimatedTime,
      opportunityIndex: row.opportunityIndex,
      estimatedAnnualRevenue: row.estimatedAnnualRevenue,
      fixes: row.fixes ?? [],
    };
  } catch {
    return null;
  }
}

export async function getIdePromptPayload(input: {
  workspaceId: string;
  opportunityId: string;
}) {
  const opportunity = await loadOpportunityForIdePrompt(input.opportunityId);
  if (!opportunity) {
    return { ok: false as const, error: "Opportunity not found" };
  }

  let website: IdePromptWebsite | null = null;
  try {
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, opportunity.reportId),
      columns: { id: true, workspaceId: true, websiteId: true },
    });
    if (!report || report.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "Forbidden" };
    }
    const site = await db.query.websites.findFirst({
      where: eq(websites.id, report.websiteId),
      columns: { id: true, name: true, domain: true, url: true },
    });
    if (site) {
      website = {
        id: site.id,
        name: site.name,
        domain: site.domain,
        url: site.url,
      };
    }
  } catch {
    return { ok: false as const, error: "Could not verify report access" };
  }

  let stack: TechStackProfile | null = null;
  try {
    const profile = await getTechProfile(input.workspaceId);
    stack = (profile?.stack as TechStackProfile) ?? null;
  } catch {
    stack = null;
  }

  const prompts = buildIdePrompts({ opportunity, website, stack });

  return {
    ok: true as const,
    opportunity,
    website,
    prompts,
    stackSummary: stackSummary(stack),
    hasStack: Boolean(stackSummary(stack)),
  };
}
