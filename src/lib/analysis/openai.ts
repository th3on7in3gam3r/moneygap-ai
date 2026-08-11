import OpenAI from "openai";
import { z } from "zod";
import {
  AnalysisPipelineError,
  classifyAiError,
} from "@/lib/analysis/ai-errors";
import { estimateTokenCount } from "@/lib/analysis/corpus";
import {
  createStructuredJsonText,
  sanitizeLlmText,
} from "@/lib/analysis/llm-request";
import { AI_GENERATION_ERROR, MISSING_KEYS_ERROR } from "@/lib/analysis/stages";
import { log } from "@/lib/observability/logger";

export { sanitizeLlmText } from "@/lib/analysis/llm-request";

export type IntelligenceResult = {
  overview: string;
  business: {
    industry: string;
    businessType: string;
    companyType: string;
    businessModel: string;
    revenueModel: string;
    targetCustomer: string;
    targetMarket: string;
    productsServices: string[];
  };
  audience: {
    primaryAudience: string;
    secondaryAudience: string;
    customerProblems: string[];
    customerGoals: string[];
    buyingIntent: string;
  };
  products: {
    products: string[];
    services: string[];
    freeResources: string[];
    digitalProducts: string[];
    subscriptions: string[];
    courses: string[];
    consulting: string[];
    community: string[];
  };
  monetization: {
    present: string[];
    missing: string[];
  };
  content: {
    blogPresence: boolean;
    contentCategories: string[];
    contentFrequency: string;
    educationalResources: string[];
    seoOpportunities: string[];
    contentStrengths: string[];
    contentStrategy: string;
  };
  trust: {
    testimonials: boolean;
    reviews: boolean;
    caseStudies: boolean;
    socialProof: boolean;
    credentials: boolean;
    customerLogos: boolean;
    details: string[];
  };
  score: {
    overall: number;
    businessClarity: number;
    audienceClarity: number;
    monetizationVisibility: number;
    contentAuthority: number;
    trustSignals: number;
  };
};

const stringArray = z.array(z.string()).default([]);

export const intelligenceResultSchema = z.object({
  overview: z.string().default(""),
  business: z
    .object({
      industry: z.string().default(""),
      businessType: z.string().default(""),
      companyType: z.string().default(""),
      businessModel: z.string().default(""),
      revenueModel: z.string().default(""),
      targetCustomer: z.string().default(""),
      targetMarket: z.string().default(""),
      productsServices: stringArray,
    })
    .passthrough(),
  audience: z
    .object({
      primaryAudience: z.string().default(""),
      secondaryAudience: z.string().default(""),
      customerProblems: stringArray,
      customerGoals: stringArray,
      buyingIntent: z.string().default(""),
    })
    .passthrough(),
  products: z
    .object({
      products: stringArray,
      services: stringArray,
      freeResources: stringArray,
      digitalProducts: stringArray,
      subscriptions: stringArray,
      courses: stringArray,
      consulting: stringArray,
      community: stringArray,
    })
    .passthrough(),
  monetization: z
    .object({
      present: stringArray,
      missing: stringArray,
    })
    .passthrough(),
  content: z
    .object({
      blogPresence: z.boolean().default(false),
      contentCategories: stringArray,
      contentFrequency: z.string().default(""),
      educationalResources: stringArray,
      seoOpportunities: stringArray,
      contentStrengths: stringArray,
      contentStrategy: z.string().default(""),
    })
    .passthrough(),
  trust: z
    .object({
      testimonials: z.boolean().default(false),
      reviews: z.boolean().default(false),
      caseStudies: z.boolean().default(false),
      socialProof: z.boolean().default(false),
      credentials: z.boolean().default(false),
      customerLogos: z.boolean().default(false),
      details: stringArray,
    })
    .passthrough(),
  score: z
    .object({
      overall: z.number().default(0),
      businessClarity: z.number().default(0),
      audienceClarity: z.number().default(0),
      monetizationVisibility: z.number().default(0),
      contentAuthority: z.number().default(0),
      trustSignals: z.number().default(0),
    })
    .passthrough(),
});

const intelligenceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overview",
    "business",
    "audience",
    "products",
    "monetization",
    "content",
    "trust",
    "score",
  ],
  properties: {
    overview: { type: "string" },
    business: {
      type: "object",
      additionalProperties: false,
      required: [
        "industry",
        "businessType",
        "companyType",
        "businessModel",
        "revenueModel",
        "targetCustomer",
        "targetMarket",
        "productsServices",
      ],
      properties: {
        industry: { type: "string" },
        businessType: { type: "string" },
        companyType: { type: "string" },
        businessModel: { type: "string" },
        revenueModel: { type: "string" },
        targetCustomer: { type: "string" },
        targetMarket: { type: "string" },
        productsServices: { type: "array", items: { type: "string" } },
      },
    },
    audience: {
      type: "object",
      additionalProperties: false,
      required: [
        "primaryAudience",
        "secondaryAudience",
        "customerProblems",
        "customerGoals",
        "buyingIntent",
      ],
      properties: {
        primaryAudience: { type: "string" },
        secondaryAudience: { type: "string" },
        customerProblems: { type: "array", items: { type: "string" } },
        customerGoals: { type: "array", items: { type: "string" } },
        buyingIntent: { type: "string" },
      },
    },
    products: {
      type: "object",
      additionalProperties: false,
      required: [
        "products",
        "services",
        "freeResources",
        "digitalProducts",
        "subscriptions",
        "courses",
        "consulting",
        "community",
      ],
      properties: {
        products: { type: "array", items: { type: "string" } },
        services: { type: "array", items: { type: "string" } },
        freeResources: { type: "array", items: { type: "string" } },
        digitalProducts: { type: "array", items: { type: "string" } },
        subscriptions: { type: "array", items: { type: "string" } },
        courses: { type: "array", items: { type: "string" } },
        consulting: { type: "array", items: { type: "string" } },
        community: { type: "array", items: { type: "string" } },
      },
    },
    monetization: {
      type: "object",
      additionalProperties: false,
      required: ["present", "missing"],
      properties: {
        present: { type: "array", items: { type: "string" } },
        missing: { type: "array", items: { type: "string" } },
      },
    },
    content: {
      type: "object",
      additionalProperties: false,
      required: [
        "blogPresence",
        "contentCategories",
        "contentFrequency",
        "educationalResources",
        "seoOpportunities",
        "contentStrengths",
        "contentStrategy",
      ],
      properties: {
        blogPresence: { type: "boolean" },
        contentCategories: { type: "array", items: { type: "string" } },
        contentFrequency: { type: "string" },
        educationalResources: { type: "array", items: { type: "string" } },
        seoOpportunities: { type: "array", items: { type: "string" } },
        contentStrengths: { type: "array", items: { type: "string" } },
        contentStrategy: { type: "string" },
      },
    },
    trust: {
      type: "object",
      additionalProperties: false,
      required: [
        "testimonials",
        "reviews",
        "caseStudies",
        "socialProof",
        "credentials",
        "customerLogos",
        "details",
      ],
      properties: {
        testimonials: { type: "boolean" },
        reviews: { type: "boolean" },
        caseStudies: { type: "boolean" },
        socialProof: { type: "boolean" },
        credentials: { type: "boolean" },
        customerLogos: { type: "boolean" },
        details: { type: "array", items: { type: "string" } },
      },
    },
    score: {
      type: "object",
      additionalProperties: false,
      required: [
        "overall",
        "businessClarity",
        "audienceClarity",
        "monetizationVisibility",
        "contentAuthority",
        "trustSignals",
      ],
      properties: {
        overall: { type: "integer" },
        businessClarity: { type: "integer" },
        audienceClarity: { type: "integer" },
        monetizationVisibility: { type: "integer" },
        contentAuthority: { type: "integer" },
        trustSignals: { type: "integer" },
      },
    },
  },
} as const;

const INTELLIGENCE_TIMEOUT_MS = 120_000;

function clampScores(parsed: IntelligenceResult): IntelligenceResult {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));
  parsed.score = {
    overall: clamp(parsed.score.overall),
    businessClarity: clamp(parsed.score.businessClarity),
    audienceClarity: clamp(parsed.score.audienceClarity),
    monetizationVisibility: clamp(parsed.score.monetizationVisibility),
    contentAuthority: clamp(parsed.score.contentAuthority),
    trustSignals: clamp(parsed.score.trustSignals),
  };
  return parsed;
}

function parseIntelligenceJson(text: string): IntelligenceResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        raw = JSON.parse(text.slice(start, end + 1));
      } catch {
        throw new AnalysisPipelineError(AI_GENERATION_ERROR, {
          errorClass: "AI_INVALID_JSON",
          cause: err,
        });
      }
    } else {
      throw new AnalysisPipelineError(AI_GENERATION_ERROR, {
        errorClass: "AI_INVALID_JSON",
        cause: err,
      });
    }
  }

  const parsed = intelligenceResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AnalysisPipelineError(AI_GENERATION_ERROR, {
      errorClass: "REPORT_VALIDATION_ERROR",
      cause: parsed.error,
    });
  }
  return clampScores(parsed.data as IntelligenceResult);
}

export async function generateWebsiteIntelligence(input: {
  url: string;
  domain: string;
  corpus: string;
  siteModel?: string;
  pageCount?: number;
  stage?: string;
}): Promise<IntelligenceResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(MISSING_KEYS_ERROR);
  }

  const client = new OpenAI({ apiKey });
  const model = (process.env.OPENAI_MODEL || "gpt-4o").trim();
  const stage = input.stage ?? "website_intelligence";
  const rawContent =
    input.siteModel && input.siteModel.length > 0
      ? `Compact site intelligence model (structured; prefer this over raw pages):\n${input.siteModel}\n\nSupporting excerpts:\n${input.corpus}`
      : `Crawled website content:\n${input.corpus}`;
  const content = sanitizeLlmText(rawContent);
  const userPrompt = sanitizeLlmText(
    `Website URL: ${input.url}\nDomain: ${input.domain}\n\n${content}`,
  );
  const schema = JSON.parse(JSON.stringify(intelligenceSchema)) as Record<
    string,
    unknown
  >;

  log("info", "llm_request_budget", {
    stage,
    model,
    pageCount: input.pageCount ?? null,
    inputChars: content.length,
    estimatedTokens: estimateTokenCount(content),
  });

  const instructions = (correction?: string) =>
    `You are a senior business intelligence analyst for MoneyGap AI.
Analyze the crawled website content and produce a precise Website Intelligence Report.
Be specific and evidence-based. Do not invent dollar amounts or money-gap calculations.
Scores are integers 0-100 reflecting clarity/visibility of each dimension on the site itself.
Overview should be 1-3 polished sentences describing what the business is.
${correction ?? ""}`;

  const runOnce = async (correction?: string) =>
    createStructuredJsonText({
      client,
      model,
      instructions: instructions(correction),
      input: userPrompt,
      schemaName: "website_intelligence",
      schema,
      timeoutMs: INTELLIGENCE_TIMEOUT_MS,
      label: "openai_website_intelligence",
    });

  try {
    let text = await runOnce();
    try {
      return parseIntelligenceJson(text);
    } catch (firstErr) {
      const cls = classifyAiError(firstErr);
      if (cls !== "AI_INVALID_JSON" && cls !== "REPORT_VALIDATION_ERROR") {
        throw firstErr;
      }
      log("warn", "intelligence_json_retry", {
        stage,
        errorClass: cls,
      });
      text = await runOnce(
        "Previous response was invalid JSON/schema. Return ONLY valid JSON matching the schema.",
      );
      return parseIntelligenceJson(text);
    }
  } catch (err) {
    if (err instanceof Error && err.message === MISSING_KEYS_ERROR) throw err;
    const errorClass = classifyAiError(err);
    log("error", "openai_intelligence_error", {
      stage,
      model,
      errorClass,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AnalysisPipelineError(AI_GENERATION_ERROR, {
      errorClass,
      cause: err,
    });
  }
}
