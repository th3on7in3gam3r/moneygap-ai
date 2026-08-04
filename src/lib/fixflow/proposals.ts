import type { OpportunityFix, TechStackProfile } from "@/db/schema";
import { buildImplementationPlan } from "@/lib/developer/planner";
import { createHeuristicFixAgent } from "@/lib/fixflow/agents/fix-agent";
import { frameworkFromStackLabel } from "@/lib/fixflow/git/provider";
import type {
  DiffPreview,
  FixFlowFramework,
  FixProposalBody,
  PrPreparePayload,
} from "@/lib/fixflow/types";

export type ProposalOpportunityInput = {
  id: string;
  reportId: string;
  title: string;
  category: string;
  moduleId: string;
  summary: string | null;
  whatsMissing: string;
  whyItMatters: string;
  businessImpact: string;
  estimatedAnnualRevenue: number | null;
  estimatedTime: string | null;
  difficulty: string;
  opportunityIndex: number;
  fixes: OpportunityFix[] | null;
};

function codeExampleFor(
  framework: FixFlowFramework,
  moduleId: string,
  category: string,
  title: string,
): string {
  const key = `${moduleId} ${category} ${title}`.toLowerCase();
  const isMeta =
    key.includes("metadata") ||
    key.includes("open graph") ||
    key.includes("og ") ||
    key.includes("twitter");
  const isLlms = key.includes("llms") || key.includes("ai readiness");
  const isSchema = key.includes("schema") || key.includes("structured");
  const isA11y = key.includes("accessib") || key.includes("a11y");
  const isImages = key.includes("image") || key.includes("lcp") || key.includes("vitals");

  if (framework === "Next.js") {
    if (isMeta) {
      return `// app/layout.tsx (App Router)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Product",
  description: "Clear value proposition for search and social.",
  openGraph: {
    title: "Your Product",
    description: "Clear value proposition for search and social.",
    type: "website",
    url: "https://example.com",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Product",
    description: "Clear value proposition for search and social.",
  },
};`;
    }
    if (isLlms) {
      return `// public/llms.txt — or generate via moneygap generate llms / AI Readiness
# example.com

> Short product summary for AI crawlers.

## Docs
- https://example.com/docs

## Contact
- https://example.com/contact`;
    }
    if (isSchema) {
      return `// app/layout.tsx — JSON-LD
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Your Company",
      url: "https://example.com",
    }),
  }}
/>`;
    }
    if (isImages) {
      return `import Image from "next/image";

<Image
  src="/hero.webp"
  alt="Descriptive alt text"
  width={1200}
  height={630}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>`;
    }
    if (isA11y) {
      return `// Prefer semantic landmarks + labeled controls
<main id="main">
  <h1>{title}</h1>
  <button type="button" aria-label="Close dialog">…</button>
</main>`;
    }
  }

  if (framework === "Astro" && isMeta) {
    return `---
const title = "Your Product";
const description = "Clear value proposition";
---
<html lang="en">
  <head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
  </head>
</html>`;
  }

  if (framework === "React" && isMeta) {
    return `// Using react-helmet-async or your head manager
<Helmet>
  <title>Your Product</title>
  <meta name="description" content="Clear value proposition" />
  <meta property="og:title" content="Your Product" />
</Helmet>`;
  }

  return `/**
 * FixFlow™ recommended change
 * Framework: ${framework}
 * Opportunity: ${title}
 *
 * Implement the recommended change in the files listed on this proposal.
 * Validate with moneygap scan / AI Readiness where applicable.
 * Do not push directly to main — use a moneygap/* feature branch.
 */`;
}

function expectedImprovementFrom(
  opp: ProposalOpportunityInput,
): string {
  const top = opp.fixes?.[0];
  const parts: string[] = [];
  if (top?.expectedImpact) parts.push(top.expectedImpact);
  if (opp.businessImpact) parts.push(opp.businessImpact.slice(0, 220));
  if (opp.opportunityIndex) {
    parts.push(`Targets Opportunity Index™ signal (OI ${opp.opportunityIndex}).`);
  }
  return parts.filter(Boolean).join(" ") || "Improved discoverability and conversion readiness.";
}

/**
 * Phase 1 Fix Proposal Engine — opportunity + stack → FixProposalBody.
 */
export function buildFixProposal(input: {
  opportunity: ProposalOpportunityInput;
  stack?: TechStackProfile | null;
}): FixProposalBody {
  const opp = input.opportunity;
  const framework = frameworkFromStackLabel(input.stack?.frontend);
  const plan = buildImplementationPlan({
    opportunity: {
      title: opp.title,
      category: opp.category,
      whatsMissing: opp.whatsMissing,
      summary: opp.summary,
      moduleId: opp.moduleId,
    },
    stack: input.stack,
  });

  const quick = opp.fixes?.find((f) => f.tier === "quick_win") ?? opp.fixes?.[0];
  const recommendedChange =
    quick?.action ||
    plan.summary ||
    `Address “${opp.title}” in the detected ${framework} codebase.`;

  const filesAffected = [...new Set([...plan.filesUpdate, ...plan.filesCreate])];
  const codeExample = codeExampleFor(
    framework,
    opp.moduleId,
    opp.category,
    opp.title,
  );

  const impact =
    opp.estimatedAnnualRevenue != null && opp.estimatedAnnualRevenue > 0
      ? `Est. annual impact signal ~$${opp.estimatedAnnualRevenue.toLocaleString()} (not a guarantee). ${opp.businessImpact.slice(0, 180)}`
      : opp.businessImpact;

  const explanation = [
    `MoneyGap FixFlow™ proposal for “${opp.title}”.`,
    `What's missing: ${opp.whatsMissing.slice(0, 280)}`,
    `Why it matters: ${opp.whyItMatters.slice(0, 200)}`,
    `Stack notes: ${plan.stackNotes ?? framework}`,
    "Requires explicit user approval before any branch or draft PR.",
  ].join("\n\n");

  return {
    issue: opp.title,
    issueDetail: opp.whatsMissing,
    impact,
    framework,
    filesAffected,
    recommendedChange,
    codeExample,
    expectedImprovement: expectedImprovementFrom(opp),
    change: {
      summary: plan.summary,
      filesCreate: plan.filesCreate,
      filesUpdate: plan.filesUpdate,
      riskLevel: plan.riskLevel,
      riskSummary: plan.riskSummary,
      validationChecklist: plan.validationChecklist,
      testingSteps: plan.testingSteps,
      rollbackSteps: plan.rollbackSteps,
    },
    explanation,
    moduleId: opp.moduleId,
    category: opp.category,
  };
}

export async function buildProposalDiffPreview(
  proposal: FixProposalBody,
): Promise<DiffPreview> {
  const agent = createHeuristicFixAgent();
  return agent.produceDiffs({ proposal });
}

export function preparePrPayload(input: {
  proposal: FixProposalBody;
  title?: string;
  baseBranch?: string;
}): PrPreparePayload {
  const slug = input.proposal.issue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36) || "fix";
  return {
    branchName: `fixflow/${slug}`,
    title: input.title ?? `fixFlow: ${input.proposal.issue}`,
    bodyMarkdown: [
      `## FixFlow™ proposal`,
      ``,
      `**Issue:** ${input.proposal.issue}`,
      ``,
      `**Recommended change:** ${input.proposal.recommendedChange}`,
      ``,
      `**Expected improvement:** ${input.proposal.expectedImprovement}`,
      ``,
      `### Explanation`,
      input.proposal.explanation,
      ``,
      `### Files`,
      ...input.proposal.filesAffected.map((f) => `- \`${f}\``),
      ``,
      `### Code example`,
      "```",
      input.proposal.codeExample,
      "```",
      ``,
      `---`,
      `Draft PR only. Do not merge without human review. Never push to main.`,
    ].join("\n"),
    baseBranch: input.baseBranch ?? "main",
    authorizeRequired: true,
    autoMerge: false,
  };
}
