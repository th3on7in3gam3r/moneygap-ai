import { buildIdePrompts, type IdePromptOpportunity } from "../src/lib/developer/ide-prompt";
import { FIX_PATH_CATALOG } from "../src/lib/fix-paths/catalog";

const opp: IdePromptOpportunity = {
  id: "opp-test",
  reportId: "rep-test",
  title: "Lack of Customer Testimonials and Social Proof",
  category: "Revenue",
  moduleId: "trust",
  summary: "Visible customer testimonials are absent.",
  whatsMissing: "No testimonial or social proof section",
  whyItMatters: "Trust reduces friction at purchase",
  businessImpact: "Lower conversion without proof",
  difficulty: "medium",
  estimatedTime: "2–4 hours",
  opportunityIndex: 50,
  estimatedAnnualRevenue: 50000,
  fixes: [
    {
      tier: "quick_win",
      action: "Add a testimonials section with 3 quotes",
      difficulty: "easy",
      estimatedTime: "2h",
      priority: "high",
      expectedImpact: "Conversion lift",
    },
  ],
};

const prompts = buildIdePrompts({ opportunity: opp, stack: null });
if (prompts.length < 4) throw new Error("expected multiple IDE tools");
const cursor = prompts.find((p) => p.tool === "cursor");
if (!cursor) throw new Error("missing cursor prompt");
if (!cursor.body.includes(opp.title)) {
  throw new Error("prompt must include problem title");
}
if (!cursor.body.toLowerCase().includes("never auto-publish") && !cursor.body.includes("do not auto-publish")) {
  throw new Error("prompt must include publish guardrail");
}
if (!cursor.body.includes("AI Estimate")) {
  throw new Error("prompt must label estimates");
}

const devPath = FIX_PATH_CATALOG.find((p) => p.id === "developer_ai");
if (!devPath?.href) throw new Error("developer_ai needs href");
const href = devPath.href({ opportunityId: "o1", reportId: "r1" });
if (!href.includes("/dashboard/ide-prompt")) {
  throw new Error(`expected ide-prompt href, got ${href}`);
}
if (!href.includes("opportunityId=o1") || !href.includes("reportId=r1")) {
  throw new Error(`href must pass both ids: ${href}`);
}

console.log("ide-prompt smoke OK", {
  tools: prompts.map((p) => p.tool),
  href,
});
