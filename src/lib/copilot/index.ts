export { isGrowthCopilotEnabled } from "@/lib/copilot/flag";
export {
  COPILOT_MODES,
  systemPromptForMode,
} from "@/lib/copilot/modes";
export {
  listMemoryEntries,
  upsertMemoryEntry,
  formatMemoryForPrompt,
} from "@/lib/copilot/memory";
export {
  loadCopilotContext,
  formatCopilotContextForPrompt,
  type CopilotWorkspaceContext,
} from "@/lib/copilot/context";
export {
  createCopilotThread,
  listCopilotThreads,
  getThreadMessages,
  runCopilotChat,
} from "@/lib/copilot/chat";
export {
  generateCopilotPlan,
  listCopilotPlans,
  type PlanKind,
} from "@/lib/copilot/planning";
export {
  runDecisionSimulation,
  listDecisionSimulations,
  approveDecisionSimulation,
} from "@/lib/copilot/decision";
export {
  generateCopilotReport,
  type ReportKind,
} from "@/lib/copilot/reporting";
export {
  hintFixPathForText,
  fixPathHref,
} from "@/lib/copilot/fix-path-hints";
