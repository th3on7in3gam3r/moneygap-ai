import type { ImplementationPlanJson, TechStackProfile } from "@/db/schema";
import { inferRiskLevel } from "@/lib/developer/risk";

export type PlanOpportunityInput = {
  title: string;
  category?: string | null;
  whatsMissing?: string | null;
  summary?: string | null;
  moduleId?: string | null;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "opportunity";
}

function stackPathHints(stack: TechStackProfile | null | undefined): {
  create: string[];
  update: string[];
  reuse: string[];
  notes: string;
} {
  const frontend = stack?.frontend ?? null;
  const orm = stack?.orm ?? null;
  const auth = stack?.auth ?? null;

  if (frontend === "Next.js") {
    return {
      create: [
        "src/app/(marketing)/[feature]/page.tsx",
        "src/components/[feature]/feature-section.tsx",
        "src/lib/[feature]/index.ts",
      ],
      update: [
        "src/app/layout.tsx",
        auth === "Clerk" ? "src/proxy.ts" : "src/middleware.ts",
      ],
      reuse: [
        "Existing UI primitives under src/components/ui",
        orm === "Drizzle" ? "src/db/schema.ts patterns" : "Existing data access layer",
      ],
      notes: `Prefer App Router patterns${orm ? ` with ${orm}` : ""}${auth ? ` and ${auth}` : ""}.`,
    };
  }

  if (frontend === "React") {
    return {
      create: ["src/components/[Feature].tsx", "src/hooks/use[Feature].ts"],
      update: ["src/App.tsx", "src/routes.tsx"],
      reuse: ["Shared layout / design tokens"],
      notes: "Keep changes inside existing React component tree.",
    };
  }

  return {
    create: ["docs/implementation-[feature].md", "src/features/[feature]/README.md"],
    update: ["README.md"],
    reuse: ["Existing project conventions"],
    notes: stack
      ? `Adapt paths to detected stack (frontend=${stack.frontend ?? "unknown"}).`
      : "No Project Memory yet — paths are generic; analyze a repo to specialize.",
  };
}

/**
 * Heuristic implementation plan from opportunity + Project Memory stack.
 */
export function buildImplementationPlan(input: {
  opportunity: PlanOpportunityInput;
  stack?: TechStackProfile | null;
}): ImplementationPlanJson {
  const slug = slugify(input.opportunity.title);
  const hints = stackPathHints(input.stack);
  const filesCreate = hints.create.map((p) => p.replace(/\[feature\]/gi, slug).replace(/\[Feature\]/g, slug));
  const filesUpdate = hints.update;
  const riskLevel = inferRiskLevel({
    filesCreate: filesCreate.length,
    filesUpdate: filesUpdate.length,
    stack: input.stack,
  });

  const missing = input.opportunity.whatsMissing || input.opportunity.summary || "gap identified in report";

  return {
    summary: `Implement “${input.opportunity.title}” against the detected stack. Address: ${missing.slice(0, 280)}`,
    filesCreate,
    filesUpdate,
    componentsReuse: hints.reuse,
    estimatedTime:
      riskLevel === "high" ? "2–4 days" : riskLevel === "medium" ? "4–8 hours" : "1–3 hours",
    riskLevel,
    riskSummary:
      riskLevel === "high"
        ? "Touches multiple layers or stack is incomplete — review carefully before merging."
        : riskLevel === "medium"
          ? "Moderate surface area; keep PR scoped to feature branch."
          : "Small, localized change set on a feature branch.",
    dependencies: [
      input.stack?.frontend ? `Frontend: ${input.stack.frontend}` : "Confirm frontend framework",
      input.stack?.orm ? `ORM: ${input.stack.orm}` : null,
      input.stack?.auth ? `Auth: ${input.stack.auth}` : null,
      input.stack?.hosting ? `Host: ${input.stack.hosting}` : null,
    ].filter(Boolean) as string[],
    validationChecklist: [
      "Feature matches opportunity intent from MoneyGap report",
      "No secrets committed",
      "Does not target main/master directly",
      "UI/copy reviewed by founder before publish",
      ...(input.stack?.frontend === "Next.js" ? ["App Router routes resolve without 404"] : []),
    ],
    testingSteps: [
      "Run local lint/typecheck if available",
      "Manually exercise the new UI path on desktop and mobile",
      "Verify soft-fail when optional integrations are disconnected",
      "Confirm rollback steps are documented in the PR body",
    ],
    rollbackSteps: [
      "Close or revert the draft PR without merging",
      "Delete the moneygap/* feature branch after revert",
      "Restore prior Project Memory only if analyze was incorrect (re-run Analyze)",
    ],
    stackNotes: hints.notes,
  };
}
