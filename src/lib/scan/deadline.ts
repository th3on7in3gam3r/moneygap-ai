import { getOrchestratorBudget } from "./crawlers/profiles";
import type { ScanProfile } from "./types";

/**
 * Active crawl SLA from Scan Profile budgets (quick 4m … enterprise 45m).
 * Distinct from failStalePreReportAnalysis soft floor (~30m) / 3h orphan ceiling.
 */
export function resolveActiveCrawlDeadlineAt(input: {
  scanMeta: Record<string, unknown> | null | undefined;
  profile: ScanProfile | string;
  startedAt?: Date | null;
  createdAt?: Date | null;
}): number {
  const meta = input.scanMeta ?? {};
  if (typeof meta.crawlDeadlineAt === "number" && Number.isFinite(meta.crawlDeadlineAt)) {
    return meta.crawlDeadlineAt;
  }
  const startedMs =
    typeof meta.crawlStartedAt === "string"
      ? Date.parse(meta.crawlStartedAt)
      : input.startedAt?.getTime() ??
        input.createdAt?.getTime() ??
        Date.now();
  const budget = getOrchestratorBudget(input.profile);
  return startedMs + budget.globalDeadlineMs;
}

export function isActiveCrawlDeadlinePassed(
  deadlineAtMs: number,
  nowMs = Date.now(),
): boolean {
  return nowMs > deadlineAtMs;
}
