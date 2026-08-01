import OpenAI from "openai";
import { COMPETITIVE_STRATEGIST_RULES, extractOutputText } from "@/lib/analysis/competitive/prompts";
import type { CompetitorWithCorpus, ProfiledCompetitor } from "@/lib/analysis/competitive/types";
import type { CompetitorProfileData } from "@/db/schema";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

const profileSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "businessOverview",
    "revenueModel",
    "products",
    "services",
    "pricingVisibility",
    "leadGeneration",
    "contentStrategy",
    "trustSignals",
    "callsToAction",
    "newsletter",
    "community",
    "digitalProducts",
    "memberships",
    "affiliateProgram",
    "consulting",
    "automation",
    "aiFeatures",
    "overallStrengths",
    "overallWeaknesses",
  ],
  properties: {
    businessOverview: { type: "string" },
    revenueModel: { type: "string" },
    products: { type: "array", items: { type: "string" } },
    services: { type: "array", items: { type: "string" } },
    pricingVisibility: { type: "string" },
    leadGeneration: { type: "string" },
    contentStrategy: { type: "string" },
    trustSignals: { type: "string" },
    callsToAction: { type: "string" },
    newsletter: { type: "string" },
    community: { type: "string" },
    digitalProducts: { type: "string" },
    memberships: { type: "string" },
    affiliateProgram: { type: "string" },
    consulting: { type: "string" },
    automation: { type: "string" },
    aiFeatures: { type: "string" },
    overallStrengths: { type: "array", items: { type: "string" } },
    overallWeaknesses: { type: "array", items: { type: "string" } },
  },
} as const;

export async function profileCompetitor(
  competitor: CompetitorWithCorpus,
): Promise<ProfiledCompetitor> {
  if (!competitor.crawlOk || !competitor.corpus.trim()) {
    return {
      ...competitor,
      profile: null,
      status: "failed",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  try {
    const response = await client.responses.create({
      model,
      instructions: `${COMPETITIVE_STRATEGIST_RULES}

Task: Build a Competitor Profile from crawled public pages.
Note absences clearly (e.g. "No visible newsletter signup").
Strengths/weaknesses should be strategic, not technical nitpicks.`,
      input: `Competitor: ${competitor.name} (${competitor.url})
Discovery summary: ${competitor.businessSummary}
Industry: ${competitor.industry}
Audience: ${competitor.targetAudience}
Size (AI Estimate): ${competitor.estimatedCompanySize}

Crawled content:
${competitor.corpus.slice(0, 35000)}`,
      text: {
        format: {
          type: "json_schema",
          name: "competitor_profile",
          strict: true,
          schema: profileSchema,
        },
      },
    });

    const text = extractOutputText(response);
    const profile = JSON.parse(text) as CompetitorProfileData;

    return {
      ...competitor,
      profile,
      status: "profiled",
    };
  } catch (err) {
    console.error(`Profile failed for ${competitor.domain}:`, err);
    return {
      ...competitor,
      profile: null,
      status: "crawled",
    };
  }
}

export async function profileCompetitorsWithConcurrency(
  competitors: CompetitorWithCorpus[],
  concurrency = 2,
): Promise<ProfiledCompetitor[]> {
  const results: ProfiledCompetitor[] = new Array(competitors.length);
  let next = 0;

  async function worker() {
    while (next < competitors.length) {
      const i = next++;
      results[i] = await profileCompetitor(competitors[i]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, competitors.length) }, () =>
      worker(),
    ),
  );

  return results;
}
