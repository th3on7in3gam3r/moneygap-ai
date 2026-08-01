import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, type WorkspacePrediction } from "@/db/schema";
import { notifyWorkspaceUsers } from "@/lib/monitor/notify";
import { listWorkspacePredictions } from "@/lib/predictive/engine";

const ALERT_KINDS = new Set([
  "business_risk",
  "revenue",
  "competitive_movement",
  "seo_trend",
]);

export async function syncPredictiveAlerts(workspaceId: string) {
  const predictions = await listWorkspacePredictions(workspaceId);
  const candidates = predictions.filter(
    (p) =>
      p.status === "open" &&
      ALERT_KINDS.has(p.kind) &&
      p.confidence >= 55,
  );

  let members: { userId: string }[] = [];
  try {
    members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspaceId),
    });
  } catch {
    return { created: 0, candidates: candidates.length };
  }

  const userIds = members.map((m) => m.userId);
  let created = 0;

  for (const p of candidates.slice(0, 5)) {
    try {
      await notifyWorkspaceUsers({
        userIds,
        workspaceId,
        type: `predictive_${p.kind}`,
        title: `Predictive · ${p.title}`,
        body: `${p.prediction.slice(0, 180)} Confidence ${p.confidence} · ${p.horizon}`,
        href: "/dashboard/predictive",
      });
      created += 1;
    } catch {
      /* soft */
    }
  }

  return { created, candidates: candidates.length };
}

export function predictionNeedsAlert(p: WorkspacePrediction) {
  return (
    p.status === "open" &&
    ALERT_KINDS.has(p.kind) &&
    p.confidence >= 55
  );
}
