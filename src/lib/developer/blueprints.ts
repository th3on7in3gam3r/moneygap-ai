import type {
  DeveloperBlueprintTool,
  ImplementationPlanJson,
  TechStackProfile,
} from "@/db/schema";

const TOOLS: {
  tool: DeveloperBlueprintTool;
  title: string;
  intro: string;
}[] = [
  {
    tool: "cursor",
    title: "Cursor Agent prompt",
    intro: "Use this as the Agent task description in Cursor.",
  },
  {
    tool: "claude",
    title: "Claude prompt",
    intro: "Paste into Claude (Projects or chat) with repo context attached.",
  },
  {
    tool: "chatgpt",
    title: "ChatGPT prompt",
    intro: "Paste into ChatGPT with relevant files uploaded.",
  },
  {
    tool: "gemini",
    title: "Gemini prompt",
    intro: "Paste into Gemini with codebase context.",
  },
  {
    tool: "copilot",
    title: "GitHub Copilot chat",
    intro: "Use in Copilot Chat / Edits with @workspace.",
  },
  {
    tool: "windsurf",
    title: "Windsurf Cascade prompt",
    intro: "Use as a Cascade task in Windsurf.",
  },
  {
    tool: "lovable",
    title: "Lovable brief",
    intro: "Product/UI-oriented brief for Lovable (review before apply).",
  },
  {
    tool: "bolt",
    title: "Bolt.new brief",
    intro: "Scaffold brief for Bolt — adapt paths to the live stack.",
  },
];

function stackBlock(stack?: TechStackProfile | null): string {
  if (!stack) return "Stack: unknown (run Developer Mode Analyze first).";
  const layers = [
    ["Frontend", stack.frontend],
    ["Backend", stack.backend],
    ["Database", stack.database],
    ["ORM", stack.orm],
    ["Auth", stack.auth],
    ["Hosting", stack.hosting],
    ["Styling", stack.styling],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `Detected stack (Project Memory™):\n${layers || "- (empty)"}\nConfidence: ${stack.confidence}%`;
}

function planBlock(plan: ImplementationPlanJson): string {
  return [
    `Summary: ${plan.summary}`,
    plan.stackNotes ? `Notes: ${plan.stackNotes}` : null,
    "",
    "Files to create:",
    ...plan.filesCreate.map((f) => `- ${f}`),
    "",
    "Files to update:",
    ...plan.filesUpdate.map((f) => `- ${f}`),
    "",
    "Reuse:",
    ...plan.componentsReuse.map((f) => `- ${f}`),
    "",
    `Estimate: ${plan.estimatedTime} | Risk: ${plan.riskLevel}`,
    `Risk summary: ${plan.riskSummary}`,
    "",
    "Validation checklist:",
    ...plan.validationChecklist.map((f) => `- [ ] ${f}`),
    "",
    "Testing:",
    ...plan.testingSteps.map((f) => `- ${f}`),
    "",
    "Rollback:",
    ...plan.rollbackSteps.map((f) => `- ${f}`),
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function renderBlueprintBody(input: {
  tool: DeveloperBlueprintTool;
  title: string;
  plan: ImplementationPlanJson;
  stack?: TechStackProfile | null;
}): string {
  const common = [
    `# ${input.title}`,
    "",
    stackBlock(input.stack),
    "",
    planBlock(input.plan),
    "",
    "Constraints:",
    "- Do not push or merge to main/master.",
    "- Prefer a moneygap/* feature branch and draft PR.",
    "- Soft-fail optional integrations; never rewrite MoneyGap Score / Opportunity Index.",
    "- Match existing project conventions and naming.",
  ].join("\n");

  if (input.tool === "lovable" || input.tool === "bolt") {
    return [
      common,
      "",
      "UI focus: ship a polished, on-brand surface for the opportunity.",
      "Avoid generic purple dashboards; follow the product’s visual system.",
    ].join("\n");
  }

  if (input.tool === "copilot") {
    return [
      common,
      "",
      "In Copilot Chat: @workspace implement the plan above in small commits.",
    ].join("\n");
  }

  return common;
}

export function generateAllBlueprints(input: {
  planTitle: string;
  plan: ImplementationPlanJson;
  stack?: TechStackProfile | null;
}): {
  tool: DeveloperBlueprintTool;
  title: string;
  body: string;
  meta: Record<string, unknown>;
}[] {
  return TOOLS.map((t) => ({
    tool: t.tool,
    title: `${t.title}: ${input.planTitle}`,
    body: [`${t.intro}`, "", renderBlueprintBody({
      tool: t.tool,
      title: input.planTitle,
      plan: input.plan,
      stack: input.stack,
    })].join("\n"),
    meta: { intro: t.intro },
  }));
}

export const IDE_PROMPT_TOOLS = TOOLS;

export const BLUEPRINT_TOOLS = TOOLS.map((t) => t.tool);
