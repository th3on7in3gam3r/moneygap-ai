import { db } from "@/db";
import { productMetricsEvents } from "@/db/schema";
import { log } from "@/lib/observability/logger";

export type ProductMetricType =
  | "report_created"
  | "gap_category_seen"
  | "project_completed"
  | "score_snapshot";

/** Anonymous product metrics — no PII in meta. */
export async function trackProductMetric(input: {
  type: ProductMetricType;
  workspaceId?: string | null;
  value?: number;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.insert(productMetricsEvents).values({
      type: input.type,
      workspaceId: input.workspaceId ?? null,
      value: input.value ?? 1,
      meta: input.meta ?? null,
    });
  } catch (err) {
    log("warn", "product_metric_soft_fail", {
      type: input.type,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
