import { isAutomationEngineEnabled } from "@/lib/automation/flag";
import { enqueueOpportunityIds, syncOpportunityQueue } from "@/lib/automation/queue";
import { log } from "@/lib/observability/logger";

/**
 * Soft-fail Continuous Optimization™ after Monitor comparison.
 * Enqueues newly detected / regressed opportunity IDs when provided; always refreshes queue.
 */
export async function runContinuousOptimizationPass(input: {
  workspaceId: string;
  reportId?: string;
  newOpportunityIds?: string[];
  regressedOpportunityIds?: string[];
}) {
  if (!isAutomationEngineEnabled()) {
    return { skipped: true as const };
  }

  try {
    const ids = [
      ...(input.newOpportunityIds ?? []),
      ...(input.regressedOpportunityIds ?? []),
    ];
    let enqueued = 0;
    if (ids.length > 0) {
      enqueued = await enqueueOpportunityIds({
        workspaceId: input.workspaceId,
        opportunityIds: ids,
        source: "monitor",
      });
    }
    const sync = await syncOpportunityQueue({
      workspaceId: input.workspaceId,
      source: "monitor",
    });
    log("info", "automation_continuous_optimization", {
      workspaceId: input.workspaceId,
      reportId: input.reportId,
      enqueued,
      upserted: sync.upserted,
    });
    return { skipped: false as const, enqueued, upserted: sync.upserted };
  } catch (err) {
    log("warn", "automation_continuous_optimization_soft_fail", {
      workspaceId: input.workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { skipped: false as const, error: String(err) };
  }
}
