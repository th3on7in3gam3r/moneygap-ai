import type {
  AutomationWorkflowKind,
  AutomationWorkflowSteps,
} from "@/db/schema";

export function buildWorkflowSteps(input: {
  title: string;
  agentSlug: string;
  kind: AutomationWorkflowKind;
  whatsMissing?: string | null;
  contextNotes?: string[];
}): AutomationWorkflowSteps {
  const base = input.whatsMissing?.slice(0, 120) || input.title;
  const steps = [
    {
      id: "discover",
      title: "Confirm gap on live product",
      detail: `Validate: ${base}`,
      ownerHint: input.agentSlug,
    },
    {
      id: "design",
      title: "Design automation path",
      detail: `Draft ${input.kind} workflow steps (no auto-publish).`,
      ownerHint: input.agentSlug,
    },
    {
      id: "implement",
      title: "Implement in staging / draft tools",
      detail:
        input.kind === "email"
          ? "Create draft sequences in email tool; do not send."
          : input.kind === "crm"
            ? "Configure CRM stages/tags as drafts only."
            : "Implement checklist items as Action Project tasks.",
      ownerHint: input.agentSlug === "developer" ? "developer" : input.agentSlug,
    },
    {
      id: "validate",
      title: "Human review & QA",
      detail: "Review copy, data mapping, and rollback before going live.",
      ownerHint: "owner",
    },
    {
      id: "measure",
      title: "Measure outcomes",
      detail: "Track MoneyGap lifecycle + estimated impact after launch.",
      ownerHint: "analytics",
    },
  ];

  if (input.contextNotes?.length) {
    steps[1] = {
      ...steps[1],
      detail: `${steps[1].detail} Context: ${input.contextNotes.slice(0, 2).join("; ")}`,
    };
  }

  return {
    kind: input.kind,
    steps,
    summary: `Executable ${input.kind} workflow for “${input.title}” (draft only — never auto-publishes).`,
  };
}
