import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAiError } from "./ai-errors";
import {
  buildCompactIntelligenceCorpus,
  buildSiteIntelligenceModel,
  dedupePagesByUrl,
  estimateTokenCount,
  INTELLIGENCE_CORPUS_BUDGET,
} from "./corpus";
import { intelligenceResultSchema } from "./openai";

function page(
  url: string,
  pageType: string,
  markdown: string,
  title = "T",
) {
  return { url, pageType, title, markdown, metadata: {} };
}

describe("corpus compaction", () => {
  it("dedupes duplicate URLs keeping richest markdown", () => {
    const pages = [
      page("https://ex.com/a", "blog", "short"),
      page("https://ex.com/a", "blog", "much longer content here"),
      page("https://ex.com/b", "about", "about"),
    ];
    const deduped = dedupePagesByUrl(pages);
    assert.equal(deduped.length, 2);
    assert.ok(deduped[0]!.markdown.includes("much longer"));
  });

  it("does not dump 43 full pages into one corpus", () => {
    const pages = Array.from({ length: 43 }, (_, i) =>
      page(
        `https://ex.com/p${i}`,
        i === 0 ? "homepage" : i === 1 ? "pricing" : "blog",
        "x".repeat(8_000),
      ),
    );
    const packed = buildCompactIntelligenceCorpus(pages);
    assert.ok(packed.pageCount <= INTELLIGENCE_CORPUS_BUDGET.maxPages);
    assert.ok(packed.inputChars <= INTELLIGENCE_CORPUS_BUDGET.maxChars);
    assert.ok(packed.estimatedTokens <= estimateTokenCount("x".repeat(INTELLIGENCE_CORPUS_BUDGET.maxChars)));
    assert.equal(packed.truncated || packed.droppedPages > 0, true);
    assert.ok(packed.prioritizedTypes.includes("homepage"));
  });

  it("builds compact site intelligence model without raw dumps", () => {
    const pages = Array.from({ length: 43 }, (_, i) =>
      page(`https://ex.com/${i}`, "blog", `Pricing plan $${i} ` + "word ".repeat(200)),
    );
    const model = buildSiteIntelligenceModel(pages);
    assert.ok(model.length < 80_000);
    const parsed = JSON.parse(model) as { pageCount: number; pages: unknown[] };
    assert.equal(parsed.pageCount, 43);
    assert.ok(parsed.pages.length <= INTELLIGENCE_CORPUS_BUDGET.maxPages);
  });
});

describe("intelligence JSON recovery", () => {
  it("accepts valid intelligence shape via zod", () => {
    const raw = {
      overview: "A business",
      business: {
        industry: "Media",
        businessType: "Blog",
        companyType: "SMB",
        businessModel: "Content",
        revenueModel: "Ads",
        targetCustomer: "Marketers",
        targetMarket: "US",
        productsServices: ["GEO"],
      },
      audience: {
        primaryAudience: "Founders",
        secondaryAudience: "SEOs",
        customerProblems: ["citations"],
        customerGoals: ["traffic"],
        buyingIntent: "high",
      },
      products: {
        products: [],
        services: ["writing"],
        freeResources: [],
        digitalProducts: [],
        subscriptions: [],
        courses: [],
        consulting: [],
        community: [],
      },
      monetization: { present: ["ads"], missing: ["checkout"] },
      content: {
        blogPresence: true,
        contentCategories: ["GEO"],
        contentFrequency: "weekly",
        educationalResources: [],
        seoOpportunities: ["schema"],
        contentStrengths: ["depth"],
        contentStrategy: "newsroom",
      },
      trust: {
        testimonials: false,
        reviews: false,
        caseStudies: false,
        socialProof: false,
        credentials: false,
        customerLogos: false,
        details: [],
      },
      score: {
        overall: 70,
        businessClarity: 70,
        audienceClarity: 70,
        monetizationVisibility: 60,
        contentAuthority: 80,
        trustSignals: 40,
      },
    };
    const parsed = intelligenceResultSchema.safeParse(raw);
    assert.equal(parsed.success, true);
  });

  it("recovers missing optional arrays with defaults", () => {
    const parsed = intelligenceResultSchema.safeParse({
      overview: "x",
      business: {},
      audience: {},
      products: {},
      monetization: {},
      content: {},
      trust: {},
      score: {},
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.deepEqual(parsed.data.products.products, []);
    }
  });
});

describe("AI error classification", () => {
  it("classifies timeout / rate / json / db", () => {
    assert.equal(classifyAiError(new Error("The operation was aborted due to timeout")), "AI_TIMEOUT");
    assert.equal(classifyAiError(new Error("Rate limit 429")), "AI_RATE_LIMIT");
    assert.equal(classifyAiError(new Error("Unexpected token < in JSON")), "AI_INVALID_JSON");
    assert.equal(
      classifyAiError(new Error('duplicate key value violates unique constraint "business_profiles_analysis_id_unique"')),
      "DATABASE_WRITE_ERROR",
    );
  });
});
