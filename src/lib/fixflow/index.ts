export type {
  FixFlowStatus,
  FixFlowFramework,
  FixFlowGitProvider,
  FixChange,
  FixProposalBody,
  FixProposalRecord,
  FileDiff,
  DiffPreview,
  RepoContext,
  FixAgent,
  FixAgentContext,
  PrPreparePayload,
} from "@/lib/fixflow/types";
export { FIXFLOW_PROTECTED_BRANCHES } from "@/lib/fixflow/types";

export {
  buildFixProposal,
  buildProposalDiffPreview,
  preparePrPayload,
  type ProposalOpportunityInput,
} from "@/lib/fixflow/proposals";

export {
  createFixflowProposal,
  getFixflowProposal,
  listFixflowProposalsForOpportunity,
  updateFixflowProposalStatus,
  getFixflowPrReadiness,
} from "@/lib/fixflow/service";

export { createHeuristicFixAgent } from "@/lib/fixflow/agents/fix-agent";
export {
  createGithubRepoProvider,
  hasGithubAuth,
  fixflowCreateBranch,
  fixflowCreateDraftPullRequest,
} from "@/lib/fixflow/github/adapter";
export {
  createGitlabStubProvider,
  frameworkFromStackLabel,
  detectFrameworkFromManifests,
  type RepoProvider,
} from "@/lib/fixflow/git/provider";
export {
  buildDiffPreview,
  buildSyntheticFileDiff,
  isEmptyDiff,
} from "@/lib/fixflow/diff/preview";
export {
  FixFlowSafetyError,
  isProtectedBranch,
  assertCanCreateBranch,
  assertCanOpenPr,
  assertProposalApproved,
  canCreatePr,
} from "@/lib/fixflow/validators/safety";
