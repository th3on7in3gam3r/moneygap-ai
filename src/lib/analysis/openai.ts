import OpenAI from "openai";
import { AI_GENERATION_ERROR, MISSING_KEYS_ERROR } from "@/lib/analysis/stages";
import { withRetry } from "@/lib/observability/logger";

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

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) {
          return part.text;
        }
      }
    }
  }

  throw new Error(AI_GENERATION_ERROR);
}

export async function generateWebsiteIntelligence(input: {
  url: string;
  domain: string;
  corpus: string;
}): Promise<IntelligenceResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(MISSING_KEYS_ERROR);
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  try {
    const response = await withRetry(
      () =>
        client.responses.create({
          model,
          instructions: `You are a senior business intelligence analyst for MoneyGap AI.
Analyze the crawled website content and produce a precise Website Intelligence Report.
Be specific and evidence-based. Do not invent dollar amounts or money-gap calculations.
Scores are integers 0-100 reflecting clarity/visibility of each dimension on the site itself.
Overview should be 1-3 polished sentences describing what the business is.`,
          input: `Website URL: ${input.url}
Domain: ${input.domain}

Crawled website content:
${input.corpus}`,
          text: {
            format: {
              type: "json_schema",
              name: "website_intelligence",
              strict: true,
              schema: intelligenceSchema,
            },
          },
        }),
      { attempts: 3, label: "openai_website_intelligence" },
    );

    const text = extractOutputText(response);
    const parsed = JSON.parse(text) as IntelligenceResult;

    // Clamp scores
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    parsed.score = {
      overall: clamp(parsed.score.overall),
      businessClarity: clamp(parsed.score.businessClarity),
      audienceClarity: clamp(parsed.score.audienceClarity),
      monetizationVisibility: clamp(parsed.score.monetizationVisibility),
      contentAuthority: clamp(parsed.score.contentAuthority),
      trustSignals: clamp(parsed.score.trustSignals),
    };

    return parsed;
  } catch (err) {
    if (err instanceof Error && err.message === MISSING_KEYS_ERROR) throw err;
    console.error("OpenAI intelligence error:", err);
    throw new Error(AI_GENERATION_ERROR);
  }
}
