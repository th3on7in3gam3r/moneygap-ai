import OpenAI from "openai";
import { COMPETITIVE_STRATEGIST_RULES, extractOutputText } from "@/lib/analysis/competitive/prompts";
import type {
  CompetitiveContext,
  DiscoveredCompetitor,
} from "@/lib/analysis/competitive/types";
import { COMPETITOR_COUNT } from "@/lib/analysis/competitive/types";
import {
  COMPETITIVE_ENGINE_ERROR,
  MISSING_KEYS_ERROR,
} from "@/lib/analysis/stages";

const discoverySchema = {
  type: "object",
  additionalProperties: false,
  required: ["competitors"],
  properties: {
    competitors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "url",
          "domain",
          "businessSummary",
          "industry",
          "targetAudience",
          "estimatedCompanySize",
        ],
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          domain: { type: "string" },
          businessSummary: { type: "string" },
          industry: { type: "string" },
          targetAudience: { type: "string" },
          estimatedCompanySize: { type: "string" },
        },
      },
    },
  },
} as const;

function normalizeUrl(raw: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.origin;
  } catch {
    return null;
  }
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function discoverCompetitors(
  ctx: CompetitiveContext,
): Promise<DiscoveredCompetitor[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const response = await client.responses.create({
    model,
    instructions: `${COMPETITIVE_STRATEGIST_RULES}

Task: Identify exactly ${COMPETITOR_COUNT} relevant competing businesses the user should learn from.

Use industry, products/services, search intent, business model, and audience.
Return real-world public websites (https URLs) when possible — not the user's own domain (${ctx.domain}).
estimatedCompanySize is an AI Estimate (e.g. "solo", "SMB", "mid-market", "enterprise").
Prefer direct competitors and strong category peers over vague big-tech brands unless they are truly relevant.`,
    input: `User website: ${ctx.url} (${ctx.domain})
Site name: ${ctx.siteName}

Business intelligence JSON:
${JSON.stringify(ctx.intelligence)}

User site corpus excerpt:
${ctx.userCorpus.slice(0, 20000)}`,
    text: {
      format: {
        type: "json_schema",
        name: "competitor_discovery",
        strict: true,
        schema: discoverySchema,
      },
    },
  });

  const text = extractOutputText(response);
  const parsed = JSON.parse(text) as { competitors: DiscoveredCompetitor[] };

  const userHost = ctx.domain.replace(/^www\./, "").toLowerCase();
  const seen = new Set<string>();
  const out: DiscoveredCompetitor[] = [];

  for (const c of parsed.competitors ?? []) {
    const url = normalizeUrl(c.url || c.domain);
    if (!url) continue;
    const domain = (c.domain || domainFromUrl(url)).replace(/^www\./, "").toLowerCase();
    if (domain === userHost || seen.has(domain)) continue;
    seen.add(domain);
    out.push({
      name: c.name || domain,
      url,
      domain,
      businessSummary: c.businessSummary || "",
      industry: c.industry || ctx.intelligence.business.industry,
      targetAudience: c.targetAudience || "",
      estimatedCompanySize: c.estimatedCompanySize || "SMB (AI Estimate)",
    });
    if (out.length >= COMPETITOR_COUNT) break;
  }

  if (out.length < 3) {
    throw new Error(COMPETITIVE_ENGINE_ERROR);
  }

  return out;
}
