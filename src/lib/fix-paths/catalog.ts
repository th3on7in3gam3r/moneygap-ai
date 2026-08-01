export type FixPathId =
  | "action_assets"
  | "checklist"
  | "developer_ai"
  | "automation"
  | "integrations"
  | "advisor";

export type FixPathDef = {
  id: FixPathId;
  title: string;
  description: string;
  /** If set, navigate externally; otherwise handled in Action Center */
  href?: (ctx: { opportunityId: string; reportId: string }) => string;
  kind: "local" | "navigate";
};

export const FIX_PATH_CATALOG: FixPathDef[] = [
  {
    id: "action_assets",
    title: "Build with Action Center",
    description: "Generate editable drafts (copy, emails, pages)—review before publish.",
    kind: "local",
  },
  {
    id: "checklist",
    title: "Manual checklist / project",
    description: "Open a playbook checklist and create an Action Project™.",
    kind: "local",
  },
  {
    id: "developer_ai",
    title: "Code + AI (Cursor / Claude / …)",
    description: "Copy IDE prompts for Cursor, Claude, and more—then implement in your editor.",
    kind: "navigate",
    href: ({ opportunityId, reportId }) =>
      `/dashboard/ide-prompt?opportunityId=${encodeURIComponent(opportunityId)}&reportId=${encodeURIComponent(reportId)}`,
  },
  {
    id: "automation",
    title: "Automation workflow",
    description: "Generate a draft workflow in Automation Studio™ (never auto-publishes).",
    kind: "navigate",
    href: ({ opportunityId }) =>
      `/dashboard/automation?opportunityId=${encodeURIComponent(opportunityId)}`,
  },
  {
    id: "integrations",
    title: "Connect tools (Hub)",
    description: "Connect CRM, email, or automation vendors in Integration Hub™.",
    kind: "navigate",
    href: () => "/dashboard/integrations",
  },
  {
    id: "advisor",
    title: "Ask Growth Advisor",
    description: "Continue in the report Advisor for guidance and trade-offs.",
    kind: "local",
  },
];
