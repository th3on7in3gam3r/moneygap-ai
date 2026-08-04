import {
  FIXFLOW_PROTECTED_BRANCHES,
  type DiffPreview,
  type FixFlowStatus,
  type FixProposalBody,
} from "@/lib/fixflow/types";
import { isEmptyDiff } from "@/lib/fixflow/diff/preview";

export class FixFlowSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FixFlowSafetyError";
  }
}

export function isProtectedBranch(branch: string): boolean {
  const name = branch.trim().toLowerCase();
  return (FIXFLOW_PROTECTED_BRANCHES as readonly string[]).includes(name);
}

export function assertCanCreateBranch(branchName: string): void {
  if (!branchName.trim()) {
    throw new FixFlowSafetyError("Branch name is required.");
  }
  if (isProtectedBranch(branchName)) {
    throw new FixFlowSafetyError(
      "Cannot create or push to a protected branch (main/master/production).",
    );
  }
  if (!branchName.startsWith("moneygap/") && !branchName.startsWith("fixflow/")) {
    throw new FixFlowSafetyError(
      "Feature branches must use the moneygap/ or fixflow/ prefix.",
    );
  }
}

export function assertProposalApproved(status: FixFlowStatus): void {
  if (status !== "approved" && status !== "ready_for_pr") {
    throw new FixFlowSafetyError(
      "User approval is required before creating a branch or pull request.",
    );
  }
}

export function assertDiffPreviewReady(preview: DiffPreview | null | undefined): void {
  if (!preview || isEmptyDiff(preview)) {
    throw new FixFlowSafetyError(
      "A non-empty diff preview is required before opening a pull request.",
    );
  }
}

export function assertExplanationPresent(proposal: FixProposalBody): void {
  if (!proposal.explanation?.trim() || !proposal.recommendedChange?.trim()) {
    throw new FixFlowSafetyError(
      "A change explanation is required before opening a pull request.",
    );
  }
}

/** Gate for future PR creation — never auto-merge. */
export function assertCanOpenPr(input: {
  status: FixFlowStatus;
  proposal: FixProposalBody;
  diffPreview: DiffPreview | null | undefined;
  branchName: string;
  authorize: unknown;
}): void {
  if (input.authorize !== true) {
    throw new FixFlowSafetyError(
      "Explicit authorize: true is required to create a FixFlow pull request.",
    );
  }
  assertProposalApproved(input.status);
  assertExplanationPresent(input.proposal);
  assertDiffPreviewReady(input.diffPreview);
  assertCanCreateBranch(input.branchName);
}

export function canCreatePr(input: {
  status: FixFlowStatus;
  proposal: FixProposalBody;
  diffPreview: DiffPreview | null | undefined;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  try {
    assertProposalApproved(input.status);
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : "Not approved");
  }
  try {
    assertExplanationPresent(input.proposal);
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : "Missing explanation");
  }
  try {
    assertDiffPreviewReady(input.diffPreview);
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : "Missing diff");
  }
  return { ok: reasons.length === 0, reasons };
}
