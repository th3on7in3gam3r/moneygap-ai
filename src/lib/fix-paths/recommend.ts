import {
  FIX_PATH_CATALOG,
  type FixPathDef,
  type FixPathId,
} from "@/lib/fix-paths/catalog";
import { resolvePlaybook } from "@/lib/advisor/playbooks";

export type FixPathOpportunityInput = {
  id: string;
  title: string;
  category: string;
  moduleId?: string | null;
  whatsMissing?: string | null;
  difficulty?: string | null;
};

export type FixPathRecommendation = {
  paths: FixPathDef[];
  recommendedId: FixPathId;
  reason: string;
};

/**
 * Heuristic recommended path. User may still pick any path.
 */
export function recommendFixPaths(
  opportunity: FixPathOpportunityInput,
): FixPathRecommendation {
  const moduleId = (opportunity.moduleId ?? "").toLowerCase();
  const difficulty = (opportunity.difficulty ?? "").toLowerCase();
  const blob = `${opportunity.title} ${opportunity.category} ${opportunity.whatsMissing ?? ""} ${moduleId}`.toLowerCase();

  const playbook = resolvePlaybook({
    moduleId: opportunity.moduleId,
    title: opportunity.title,
    category: opportunity.category,
    whatsMissing: opportunity.whatsMissing ?? "",
  });

  let recommendedId: FixPathId = "checklist";
  let reason = "Start with a checklist, then pick a deeper path if needed.";

  const isDevHeavy =
    difficulty === "hard" ||
    difficulty === "high" ||
    /schema migration|db schema|database schema|auth|clerk|middleware|api route|database|migration|drizzle|prisma/.test(
      blob,
    ) ||
    (moduleId === "ai" && playbook !== "site_chatbot");

  const isAutomation =
    moduleId === "automation" ||
    /automat|workflow|zapier|crm sync|nurture sequence/.test(blob);

  const isMarketingAssets =
    [
      "newsletter",
      "faq",
      "testimonials",
      "backlinks",
      "lead_magnet",
      "seo_content",
      "site_chatbot",
      "schema_markup",
    ].includes(playbook) ||
    moduleId === "marketing" ||
    moduleId === "content" ||
    moduleId === "seo" ||
    moduleId === "trust" ||
    /email|newsletter|testimonial|review|landing page|copy/.test(blob);

  // Draft-shaped packs — prefer Action Center before Developer Mode
  if (playbook === "site_chatbot" || playbook === "schema_markup") {
    recommendedId = "action_assets";
    reason = "Playbook-friendly gap—Build with Action Center for editable drafts.";
  } else if (isDevHeavy) {
    recommendedId = "developer_ai";
    reason =
      "Looks implementation-heavy—Code + AI (plans & blueprints) is a strong fit.";
  } else if (isAutomation) {
    recommendedId = "automation";
    reason = "Automation-shaped gap—draft a workflow in Automation Studio™.";
  } else if (isMarketingAssets) {
    recommendedId = "action_assets";
    reason = "Playbook-friendly gap—Build with Action Center for editable drafts.";
  }

  // Stable order: recommended first, then rest in catalog order
  const recommended = FIX_PATH_CATALOG.find((p) => p.id === recommendedId)!;
  const rest = FIX_PATH_CATALOG.filter((p) => p.id !== recommendedId);
  return {
    paths: [recommended, ...rest],
    recommendedId,
    reason,
  };
}
