import {
  buildDiffPreview,
  buildSyntheticFileDiff,
} from "@/lib/fixflow/diff/preview";
import type {
  DiffPreview,
  FixAgent,
  FixAgentContext,
  FixChange,
} from "@/lib/fixflow/types";

/**
 * Heuristic FixAgent stub — produces explanations and synthetic diffs.
 * Does not write to GitHub. LLM codegen plugs in later behind the same interface.
 */
export function createHeuristicFixAgent(): FixAgent {
  return {
    async understandContext(input: FixAgentContext): Promise<string> {
      const fw = input.proposal.framework;
      const repo = input.repo?.fullName
        ? `Repo ${input.repo.fullName} (${input.repo.provider}).`
        : "No repository connected yet.";
      return [
        `Issue: ${input.proposal.issue}`,
        `Framework context: ${fw}.`,
        repo,
        input.proposal.issueDetail.slice(0, 400),
      ].join(" ");
    },

    async generateChanges(input: FixAgentContext): Promise<FixChange> {
      return input.proposal.change;
    },

    async explainModifications(input: FixAgentContext): Promise<string> {
      return (
        input.proposal.explanation ||
        `${input.proposal.recommendedChange} Expected: ${input.proposal.expectedImprovement}`
      );
    },

    async produceDiffs(input: FixAgentContext): Promise<DiffPreview> {
      const files = [
        ...input.proposal.change.filesCreate.map((path) =>
          buildSyntheticFileDiff({
            path,
            action: "create",
            content: input.proposal.codeExample || `// TODO: implement ${path}\n`,
            explanation: `Create ${path} for: ${input.proposal.recommendedChange}`,
          }),
        ),
        ...input.proposal.change.filesUpdate.map((path) =>
          buildSyntheticFileDiff({
            path,
            action: "update",
            content:
              input.proposal.codeExample ||
              `// Update ${path}\n// ${input.proposal.recommendedChange}\n`,
            explanation: `Update ${path}: ${input.proposal.recommendedChange}`,
          }),
        ),
      ];
      return buildDiffPreview(
        files,
        `Synthetic preview for “${input.proposal.issue}” — review before any PR.`,
      );
    },
  };
}
