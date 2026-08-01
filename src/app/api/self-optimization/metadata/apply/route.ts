import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  confirmMetadataApply,
  rejectMetadataDraft,
} from "@/lib/self-optimization";

const schema = z.object({
  draftId: z.string().uuid(),
  action: z.enum(["apply", "reject"]).default("apply"),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return Response.json({ error: "draftId required" }, { status: 400 });
    }

    if (body.data.action === "reject") {
      const result = await rejectMetadataDraft(body.data.draftId, workspace.id);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 404 });
      }
      return Response.json(result);
    }

    const result = await confirmMetadataApply(body.data.draftId, workspace.id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: "Apply failed", detail: String(err) },
      { status: 500 },
    );
  }
}
