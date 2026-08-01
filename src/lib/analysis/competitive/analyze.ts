import OpenAI from "openai";
import { COMPETITIVE_STRATEGIST_RULES, extractOutputText } from "@/lib/analysis/competitive/prompts";
import type {
  CompetitiveContext,
  ProfiledCompetitor,
} from "@/lib/analysis/competitive/types";
import type { CompetitiveAnalysisPayload } from "@/db/schema";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

const gapItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "competitorName",
    "competitorHas",
    "userMissing",
    "whyItMatters",
    "estimatedOpportunity",
    "priority",
    "recommendation",
  ],
  properties: {
    title: { type: "string" },
    competitorName: { type: "string" },
    competitorHas: { type: "string" },
    userMissing: { type: "string" },
    whyItMatters: { type: "string" },
    estimatedOpportunity: { type: "string" },
    priority: {
      type: "string",
      enum: ["critical", "high", "medium", "low"],
    },
    recommendation: { type: "string" },
  },
} as const;

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "competitiveBrief",
    "competitiveScore",
    "headToHead",
    "opportunityGaps",
    "contentGaps",
    "authorityGaps",
    "monetizationGaps",
    "advantages",
    "swot",
    "recommendations",
    "opportunityTimeline",
  ],
  properties: {
    competitiveBrief: { type: "string" },
    competitiveScore: { type: "integer" },
    headToHead: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "competitorName",
          "competitorDomain",
          "category",
          "you",
          "competitor",
          "gap",
          "businessImpact",
          "priority",
        ],
        properties: {
          competitorName: { type: "string" },
          competitorDomain: { type: "string" },
          category: { type: "string" },
          you: { type: "string" },
          competitor: { type: "string" },
          gap: { type: "string" },
          businessImpact: { type: "string" },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
        },
      },
    },
    opportunityGaps: { type: "array", items: gapItemSchema },
    contentGaps: { type: "array", items: gapItemSchema },
    authorityGaps: { type: "array", items: gapItemSchema },
    monetizationGaps: { type: "array", items: gapItemSchema },
    advantages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "howToLeanIn"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          howToLeanIn: { type: "string" },
        },
      },
    },
    swot: {
      type: "object",
      additionalProperties: false,
      required: ["strengths", "weaknesses", "opportunities", "threats"],
      properties: {
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        opportunities: { type: "array", items: { type: "string" } },
        threats: { type: "array", items: { type: "string" } },
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "rank",
          "title",
          "action",
          "businessImpact",
          "easeOfImplementation",
          "expectedRoi",
          "priority",
        ],
        properties: {
          rank: { type: "integer" },
          title: { type: "string" },
          action: { type: "string" },
          businessImpact: { type: "string" },
          easeOfImplementation: { type: "string" },
          expectedRoi: { type: "string" },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
        },
      },
    },
    opportunityTimeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["timeframe", "title", "action", "expectedOutcome", "priority"],
        properties: {
          timeframe: {
            type: "string",
            enum: ["today", "this_week", "this_month", "next_quarter"],
          },
          title: { type: "string" },
          action: { type: "string" },
          expectedOutcome: { type: "string" },
          priority: { type: "string" },
        },
      },
    },
  },
} as const;

export async function analyzeCompetitiveLandscape(input: {
  ctx: CompetitiveContext;
  competitors: ProfiledCompetitor[];
}): Promise<{
  competitiveBrief: string;
  competitiveScore: number;
  competitiveAnalysis: CompetitiveAnalysisPayload;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const profiled = input.competitors.filter((c) => c.profile);
  const competitorPayload = profiled.map((c) => ({
    name: c.name,
    domain: c.domain,
    url: c.url,
    businessSummary: c.businessSummary,
    industry: c.industry,
    targetAudience: c.targetAudience,
    estimatedCompanySize: c.estimatedCompanySize,
    profile: c.profile,
  }));

  const response = await client.responses.create({
    model,
    instructions: `${COMPETITIVE_STRATEGIST_RULES}

Task: Produce a full Competitive Intelligence™ strategic analysis.

Head-to-head categories (use these names): Revenue, Authority, SEO, Content, Trust, Conversion, Marketing, Automation, Customer Experience.
For each important competitor×category pair (not every combo — prioritize material gaps), fill You / Competitor / Gap / Business Impact / Priority.

Include:
- opportunityGaps (general strategic gaps)
- contentGaps (topics/formats peers cover that user does not)
- authorityGaps (mentions, PR, partnerships — business impact, not vanity SEO)
- monetizationGaps (subscriptions, memberships, courses, consulting, affiliates, etc. that fit the user's model)
- advantages (where USER is stronger — lean-in plays)
- swot from the competitive landscape
- Exactly 10 recommendations ranked 1–10 by business impact, ease, expected ROI
- opportunityTimeline across today / this_week / this_month / next_quarter
- competitiveBrief: 2–4 paragraph Executive Competitive Brief (strategist voice)
- competitiveScore: 0–100 how much competitive opportunity remains uncaptured (higher = more gap vs peers)

estimatedOpportunity must be framed as AI Estimate (ranges OK, e.g. "$10,000–$30,000 annually").`,
    input: `User website: ${input.ctx.url} (${input.ctx.domain})
Site name: ${input.ctx.siteName}

User business intelligence:
${JSON.stringify(input.ctx.intelligence)}

User corpus excerpt:
${input.ctx.userCorpus.slice(0, 25000)}

Competitor profiles JSON:
${JSON.stringify(competitorPayload).slice(0, 60000)}`,
    text: {
      format: {
        type: "json_schema",
        name: "competitive_analysis",
        strict: true,
        schema: analysisSchema,
      },
    },
  });

  const text = extractOutputText(response);
  const parsed = JSON.parse(text) as {
    competitiveBrief: string;
    competitiveScore: number;
  } & Omit<CompetitiveAnalysisPayload, "competitorCount">;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  return {
    competitiveBrief:
      parsed.competitiveBrief ||
      "We analyzed the competitive landscape. Focus on the highest-priority gaps and lean into existing strengths.",
    competitiveScore: clamp(parsed.competitiveScore ?? 50),
    competitiveAnalysis: {
      headToHead: parsed.headToHead ?? [],
      opportunityGaps: parsed.opportunityGaps ?? [],
      contentGaps: parsed.contentGaps ?? [],
      authorityGaps: parsed.authorityGaps ?? [],
      monetizationGaps: parsed.monetizationGaps ?? [],
      advantages: parsed.advantages ?? [],
      swot: parsed.swot ?? {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      },
      recommendations: (parsed.recommendations ?? [])
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 10),
      opportunityTimeline: parsed.opportunityTimeline ?? [],
      competitorCount: profiled.length,
    },
  };
}
