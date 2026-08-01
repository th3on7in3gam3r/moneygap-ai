import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  ackLaunchCheck,
  getLaunchReadiness,
  isPlatform10Enabled,
} from "@/lib/launch";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function GET() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit({
    key: `launch:${userId}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } },
    );
  }

  if (!isPlatform10Enabled()) {
    return Response.json({
      enabled: false,
      message: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0).",
      checks: [],
    });
  }

  const { workspace } = await ensureUserAndWorkspace();
  const readiness = await getLaunchReadiness({ workspaceId: workspace.id });
  return Response.json(readiness);
}

const postSchema = z.object({
  checkId: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatform10Enabled()) {
    return Response.json(
      { error: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0)." },
      { status: 503 },
    );
  }

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { workspace, userId: appUserId } = await ensureUserAndWorkspace();
  const ack = await ackLaunchCheck({
    workspaceId: workspace.id,
    userId: appUserId,
    checkId: parsed.data.checkId,
  });
  return Response.json({ ack });
}
