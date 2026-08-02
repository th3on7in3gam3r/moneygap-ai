import { recommendFixPaths } from "../src/lib/fix-paths";

const marketing = recommendFixPaths({
  id: "opp-mkt",
  title: "Missing testimonial request email",
  category: "Trust",
  moduleId: "trust",
  whatsMissing: "No post-purchase review / testimonial ask email",
});

if (marketing.recommendedId !== "action_assets") {
  throw new Error(
    `expected action_assets for marketing, got ${marketing.recommendedId}`,
  );
}
if (marketing.paths[0]?.id !== "action_assets") {
  throw new Error("recommended path should be first");
}

const developer = recommendFixPaths({
  id: "opp-dev",
  title: "Add Clerk middleware auth on API routes",
  category: "Technical",
  moduleId: "ai",
  whatsMissing: "Schema migration and auth middleware missing",
  difficulty: "hard",
});

if (developer.recommendedId !== "developer_ai") {
  throw new Error(
    `expected developer_ai for hard/schema auth, got ${developer.recommendedId}`,
  );
}

const automation = recommendFixPaths({
  id: "opp-auto",
  title: "CRM nurture sequence",
  category: "Automation",
  moduleId: "automation",
  whatsMissing: "No Zapier workflow for lead nurture",
});

if (automation.recommendedId !== "automation") {
  throw new Error(
    `expected automation for workflow gap, got ${automation.recommendedId}`,
  );
}

const fallback = recommendFixPaths({
  id: "opp-gen",
  title: "Improve pricing page clarity",
  category: "Product",
  moduleId: "product",
  whatsMissing: "Unclear positioning on pricing",
});

if (fallback.recommendedId !== "checklist") {
  throw new Error(
    `expected checklist fallback, got ${fallback.recommendedId}`,
  );
}

const schemaMarkup = recommendFixPaths({
  id: "opp-schema",
  title: "Missing Schema Markup for Key Offers",
  category: "seo",
  moduleId: "seo",
  whatsMissing:
    "No implementation of schema markup for product offerings or service details",
  difficulty: "medium",
});

if (schemaMarkup.recommendedId !== "action_assets") {
  throw new Error(
    `expected action_assets for schema markup, got ${schemaMarkup.recommendedId}`,
  );
}

console.log("fix-paths smoke OK", {
  marketing: marketing.recommendedId,
  developer: developer.recommendedId,
  automation: automation.recommendedId,
  fallback: fallback.recommendedId,
  schemaMarkup: schemaMarkup.recommendedId,
});
