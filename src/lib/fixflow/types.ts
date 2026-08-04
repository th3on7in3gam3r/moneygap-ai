/**
 * MoneyGap FixFlow™ — shared types for proposal → review → branch → draft PR.
 * Safety: never auto-merge; never write main/master without explicit validators.
 */

export type FixFlowStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "ready_for_pr";

export type FixFlowFramework =
  | "Next.js"
  | "React"
  | "Astro"
  | "Vue"
  | "SvelteKit"
  | "Nuxt"
  | "Remix"
  | "Unknown";

export type FixFlowGitProvider = "github" | "gitlab";

export type FixChange = {
  summary: string;
  filesCreate: string[];
  filesUpdate: string[];
  riskLevel: "low" | "medium" | "high";
  riskSummary: string;
  validationChecklist: string[];
  testingSteps: string[];
  rollbackSteps: string[];
};

export type FixProposalBody = {
  issue: string;
  issueDetail: string;
  impact: string;
  framework: FixFlowFramework;
  filesAffected: string[];
  recommendedChange: string;
  codeExample: string;
  expectedImprovement: string;
  change: FixChange;
  explanation: string;
  moduleId?: string | null;
  category?: string | null;
};

/** Persisted row shape (API response). */
export type FixProposalRecord = {
  id: string;
  workspaceId: string;
  opportunityId: string | null;
  reportId: string | null;
  repoId: string | null;
  planId: string | null;
  status: FixFlowStatus;
  title: string;
  proposal: FixProposalBody;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FileDiff = {
  path: string;
  action: "create" | "update" | "delete";
  unifiedDiff: string;
  explanation: string;
};

export type DiffPreview = {
  files: FileDiff[];
  summary: string;
  empty: boolean;
};

export type RepoContext = {
  provider: FixFlowGitProvider;
  fullName: string;
  defaultBranch: string;
  framework: FixFlowFramework;
  structureHints: string[];
  dependencies: Record<string, string>;
  connected: boolean;
  message?: string;
};

export type FixAgentContext = {
  proposal: FixProposalBody;
  repo?: RepoContext | null;
};

export type FixAgent = {
  understandContext: (input: FixAgentContext) => Promise<string>;
  generateChanges: (input: FixAgentContext) => Promise<FixChange>;
  explainModifications: (input: FixAgentContext) => Promise<string>;
  produceDiffs: (input: FixAgentContext) => Promise<DiffPreview>;
};

export type PrPreparePayload = {
  branchName: string;
  title: string;
  bodyMarkdown: string;
  baseBranch: string;
  authorizeRequired: true;
  autoMerge: false;
};

export const FIXFLOW_PROTECTED_BRANCHES = [
  "main",
  "master",
  "production",
  "prod",
] as const;
