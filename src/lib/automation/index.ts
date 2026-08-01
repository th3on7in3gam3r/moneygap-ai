export {
  isAutomationEngineEnabled,
  agentSlugForModule,
  SEED_AGENTS,
} from "@/lib/automation/flag";
export { ensureAutomationAgents, listAutomationAgents } from "@/lib/automation/agents";
export { loadAutomationContext } from "@/lib/automation/context";
export {
  syncOpportunityQueue,
  listQueueItems,
  patchQueueItem,
  enqueueOpportunityIds,
} from "@/lib/automation/queue";
export { buildWorkflowSteps } from "@/lib/automation/workflow-build";
export {
  generateWorkflow,
  getWorkflowDetail,
  runWorkflow,
} from "@/lib/automation/workflows";
export {
  createSprintFromQueue,
  listSprints,
  getActiveSprint,
} from "@/lib/automation/sprints";
export { runContinuousOptimizationPass } from "@/lib/automation/optimize";
export {
  generateExecutiveBriefing,
  listExecutiveBriefings,
} from "@/lib/automation/briefing";
export {
  ensureMarketplaceTemplates,
  listMarketplaceTemplates,
  installMarketplaceTemplate,
} from "@/lib/automation/marketplace";
export { getAutomationStudioOverview } from "@/lib/automation/studio";
export { canManageAutomation } from "@/lib/automation/permissions";
