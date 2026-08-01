import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, apiRequestLogs, workspaces, type ApiKeyScope } from "@/db/schema";
import {
  assertWithinLimit,
  getWorkspacePlanId,
  planHasFeature,
  recordUsage,
  requireFeature,
} from "@/lib/billing";
import { findApiKeyByRaw, keyHasScope } from "@/lib/platform/keys";

export type ApiAuthOk = {
  ok: true;
  workspaceId: string;
  workspaceOwnerId: string;
  planId: string;
  apiKeyId: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
  environment: string;
};

export type ApiAuthDenied = {
  ok: false;
  status: number;
  code: string;
  error: string;
  suggestedPlan?: string;
};

function extractRawKey(req: Request): string | null {
  const headerKey = req.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;
  const auth = req.headers.get("authorization")?.trim();
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

export async function authenticateApiRequest(
  req: Request,
  requiredScope: ApiKeyScope,
): Promise<ApiAuthOk | ApiAuthDenied> {
  const raw = extractRawKey(req);
  if (!raw) {
    return {
      ok: false,
      status: 401,
      code: "missing_api_key",
      error: "Provide Authorization: Bearer <api_key> or X-API-Key.",
    };
  }

  const key = await findApiKeyByRaw(raw);
  if (!key) {
    return {
      ok: false,
      status: 401,
      code: "invalid_api_key",
      error: "Invalid or revoked API key.",
    };
  }

  if (!keyHasScope(key.scopes, requiredScope)) {
    return {
      ok: false,
      status: 403,
      code: "insufficient_scope",
      error: `API key missing required scope: ${requiredScope}`,
    };
  }

  const feature = await requireFeature(key.workspaceId, "api_access");
  if (!feature.ok) {
    return {
      ok: false,
      status: 403,
      code: feature.code,
      error: feature.message,
      suggestedPlan: feature.suggestedPlan,
    };
  }

  const planId = await getWorkspacePlanId(key.workspaceId);
  if (!planHasFeature(planId, "api_access")) {
    return {
      ok: false,
      status: 403,
      code: "upgrade_required",
      error: "API access requires Professional, Agency, or Enterprise.",
      suggestedPlan: "professional",
    };
  }

  const usage = await assertWithinLimit({
    workspaceId: key.workspaceId,
    planId,
    type: "api_call",
  });
  if (!usage.ok) {
    return {
      ok: false,
      status: 429,
      code: "usage_limit",
      error: usage.message,
      suggestedPlan: "enterprise",
    };
  }

  const windowStart = new Date(Date.now() - 60_000);
  const recent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiRequestLogs)
    .where(
      and(
        eq(apiRequestLogs.apiKeyId, key.id),
        gte(apiRequestLogs.createdAt, windowStart),
      ),
    );
  const count = recent[0]?.count ?? 0;
  if (count >= key.rateLimitPerMinute) {
    return {
      ok: false,
      status: 429,
      code: "rate_limited",
      error: `Rate limit exceeded (${key.rateLimitPerMinute}/min).`,
    };
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, key.workspaceId),
  });
  if (!workspace) {
    return {
      ok: false,
      status: 401,
      code: "invalid_workspace",
      error: "Workspace not found for API key.",
    };
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  return {
    ok: true,
    workspaceId: key.workspaceId,
    workspaceOwnerId: workspace.ownerId,
    planId,
    apiKeyId: key.id,
    scopes: key.scopes,
    rateLimitPerMinute: key.rateLimitPerMinute,
    environment: key.environment,
  };
}

export async function logApiRequest(input: {
  workspaceId: string;
  apiKeyId: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode?: string | null;
  durationMs?: number;
  req: Request;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.insert(apiRequestLogs).values({
      workspaceId: input.workspaceId,
      apiKeyId: input.apiKeyId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      errorCode: input.errorCode ?? null,
      durationMs: input.durationMs ?? null,
      ip: input.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: input.req.headers.get("user-agent")?.slice(0, 500) ?? null,
      meta: input.meta ?? null,
    });
    if (input.statusCode < 500) {
      await recordUsage({
        workspaceId: input.workspaceId,
        type: "api_call",
        meta: { path: input.path, status: input.statusCode },
      });
    }
  } catch (err) {
    console.error("logApiRequest soft-fail:", err);
  }
}

export function apiError(
  denied: ApiAuthDenied,
  extras?: Record<string, unknown>,
) {
  return Response.json(
    {
      error: denied.error,
      code: denied.code,
      suggestedPlan: denied.suggestedPlan,
      ...extras,
    },
    { status: denied.status },
  );
}
