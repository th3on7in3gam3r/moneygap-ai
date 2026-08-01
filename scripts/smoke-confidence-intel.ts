import { enrichOpportunityConfidence } from "../src/lib/confidence/enrich";
import { isConfidenceIntelEnabled } from "../src/lib/confidence/enrich";
import type { FindingLike } from "../src/lib/confidence/types";

const fixture: FindingLike = {
  title: "Add newsletter capture",
  category: "marketing",
  moduleId: "marketing",
  detectionStatus: "not_found",
  confidence: 78,
  evidenceSummary: "No email signup form found in crawl.",
  supportingSignals: ["No Mailchimp/Klaviyo embeds"],
  businessReasoning: "Email list drives retention for this business model.",
  detectionSource: "module:marketing",
  difficulty: "medium",
  severity: "high",
  estimatedAnnualRevenue: 12000,
  estimatedLeads: 400,
  estimatedTraffic: null,
  estimatedConversionLift: 8,
  businessImpact: "Capture more leads from organic traffic.",
  whatsMissing: "Newsletter signup",
  whyItMatters: "Owned audience reduces paid dependency.",
  expectedRoi: 4,
  fixes: [{ action: "Add form", tier: "quick_win", difficulty: "easy", estimatedTime: "2h", priority: "high", expectedImpact: "Leads" }],
  trustMeta: {
    factors: {
      detectionQuality: 85,
      dataCompleteness: 70,
      industryConfidence: 80,
      aiCertainty: 78,
    },
    qaFlags: [],
  },
  kgMeta: {
    industrySlug: "saas",
    businessModelSlug: "subscription",
    ruleHits: ["email_capture"],
    patternHits: ["owned_audience"],
    industryFitNote: "SaaS sites typically offer newsletter or waitlist.",
    businessModelFitNote: "Subscription models benefit from nurture sequences.",
  },
};

const withStack = enrichOpportunityConfidence(fixture, {
  corpusChars: 5000,
  hasTechProfile: true,
  techProfile: {
    frontend: "Next.js",
    backend: "Next.js API / Route Handlers",
    database: "PostgreSQL",
    orm: "Drizzle",
    auth: "Clerk",
    hosting: "Vercel",
    styling: "Tailwind CSS",
    analytics: null,
    payments: "Stripe",
    email: "Resend",
    ai: null,
    evidence: ["package.json"],
    confidence: 90,
  },
});

if (withStack.overall < 40) throw new Error("overall too low with rich fixture");
if (!withStack.engines.business || !withStack.engines.ai) {
  throw new Error("engines missing");
}
if (withStack.impact.labeled !== "estimated") {
  throw new Error("impact must be labeled estimated");
}
if (withStack.validationChecklist.length < 3) {
  throw new Error("validation checklist too short");
}

const noStack = enrichOpportunityConfidence(fixture, {
  corpusChars: 100,
  hasTechProfile: false,
});
if (noStack.engines.developer >= withStack.engines.developer) {
  throw new Error("developer confidence should be lower without Project Memory");
}

// Flag path: enabled by default when unset
if (!isConfidenceIntelEnabled() && process.env.FEATURE_CONFIDENCE_INTEL === undefined) {
  throw new Error("should be enabled by default");
}

console.log("confidence-intel smoke OK", {
  overall: withStack.overall,
  engines: withStack.engines,
  risk: withStack.risk.level,
  developerWithoutMemory: noStack.engines.developer,
});
