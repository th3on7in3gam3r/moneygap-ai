import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  createCopilotThread,
  isGrowthCopilotEnabled,
  listCopilotThreads,
} from "@/lib/copilot";
import type { CopilotMode } from "@/db/schema";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ enabled: false, threads: [] });
  }
  try {
    const ctx = await loadAgencyContext();
    const threads = await listCopilotThreads(ctx.workspace.id);
    return Response.json({ enabled: true, threads });
  } catch {
    return Response.json({ error: "Could not list threads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ error: "Growth Copilot disabled" }, { status: 403 });
  }

  try {
    const ctx = await loadAgencyContext();
    const body = (await req.json()) as {
      mode?: CopilotMode;
      title?: string;
      clientId?: string | null;
    };

    const thread = await createCopilotThread({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      mode: body.mode ?? "ceo",
      title: body.title,
      clientId: body.clientId,
    });

    return Response.json({ thread });
  } catch {
    return Response.json({ error: "Could not create thread" }, { status: 500 });
  }
}
