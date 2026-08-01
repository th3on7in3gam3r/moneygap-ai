import { recommendFixPaths } from "@/lib/fix-paths";
import type { FixPathId } from "@/lib/fix-paths";

export function hintFixPathForText(input: {
  title?: string;
  category?: string;
  moduleId?: string | null;
  whatsMissing?: string | null;
  difficulty?: string | null;
}): { recommendedId: FixPathId; reason: string; hrefs: Record<string, string> } {
  const rec = recommendFixPaths({
    id: "hint",
    title: input.title ?? "Opportunity",
    category: input.category ?? "Growth",
    moduleId: input.moduleId,
    whatsMissing: input.whatsMissing,
    difficulty: input.difficulty,
  });

  const hrefs: Record<string, string> = {};
  for (const p of rec.paths) {
    if (p.href) {
      hrefs[p.id] = p.href({ opportunityId: "hint", reportId: "" });
    }
  }

  return {
    recommendedId: rec.recommendedId,
    reason: rec.reason,
    hrefs,
  };
}

export function fixPathHref(pathId: FixPathId, opportunityId?: string | null) {
  const oid = opportunityId?.trim() || "";
  switch (pathId) {
    case "developer_ai":
      return oid
        ? `/dashboard/ide-prompt?opportunityId=${encodeURIComponent(oid)}`
        : "/dashboard/ide-prompt";
    case "automation":
      return oid
        ? `/dashboard/automation?opportunityId=${encodeURIComponent(oid)}`
        : "/dashboard/automation";
    case "integrations":
      return "/dashboard/integrations";
    case "advisor":
      return "/dashboard/reports";
    case "action_assets":
    case "checklist":
    default:
      return "/dashboard/money-gaps";
  }
}
