import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import type { FeatureKey } from "@/lib/billing/catalog";
import {
  planHasFeature,
  suggestedPlanForFeature,
} from "@/lib/billing/entitlements";
import { upgradeMessage } from "@/lib/billing/messages";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import {
  assertWithinLimit,
  type UsageType,
} from "@/lib/billing/usage";

export type GateDenied = {
  ok: false;
  code: "upgrade_required" | "usage_limit";
  feature?: FeatureKey;
  message: string;
  suggestedPlan?: string;
  limit?: number;
  used?: number;
};

export type GateOk = { ok: true; planId: string };

export async function requireFeature(
  workspaceId: string,
  feature: FeatureKey,
): Promise<GateOk | GateDenied> {
  const sub = await getWorkspaceSubscription(workspaceId);
  const planId = sub.planId;
  if (!planHasFeature(planId, feature)) {
    return {
      ok: false,
      code: "upgrade_required",
      feature,
      message: upgradeMessage(feature),
      suggestedPlan: suggestedPlanForFeature(feature),
    };
  }
  return { ok: true, planId };
}

export async function requireFeatureAndUsage(input: {
  workspaceId: string;
  feature: FeatureKey;
  usageType?: UsageType;
}): Promise<GateOk | GateDenied> {
  const featureGate = await requireFeature(input.workspaceId, input.feature);
  if (!featureGate.ok) return featureGate;

  if (input.usageType) {
    const usageGate = await assertWithinLimit({
      workspaceId: input.workspaceId,
      planId: featureGate.planId,
      type: input.usageType,
    });
    if (!usageGate.ok) {
      return {
        ok: false,
        code: "usage_limit",
        feature: input.feature,
        message: usageGate.message,
        suggestedPlan: suggestedPlanForFeature(input.feature),
        limit: usageGate.limit,
        used: usageGate.used,
      };
    }
  }

  return featureGate;
}

export async function getWorkspacePlanId(workspaceId: string): Promise<string> {
  const sub = await getWorkspaceSubscription(workspaceId);
  return sub.planId;
}

export async function syncPlanFromWorkspaceRow(workspaceId: string) {
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!ws) return null;
  return getWorkspaceSubscription(workspaceId);
}

export function upgradeResponse(denied: GateDenied, status = 403) {
  return Response.json(
    {
      error: denied.message,
      code: denied.code,
      feature: denied.feature,
      suggestedPlan: denied.suggestedPlan,
      limit: denied.limit,
      used: denied.used,
    },
    { status },
  );
}
