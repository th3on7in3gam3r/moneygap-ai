import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { validateLlmsFile } from "@/lib/ai-readiness";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  fetchRemoteLlms,
  getWebsiteForWorkspace,
} from "@/lib/ai-readiness/service";

const bodySchema = z.object({
  websiteId: z.string().uuid().optional(),
  content: z.string().optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await loadAgencyContext();
    let content = parsed.data.content ?? null;

    if (!content && parsed.data.websiteId) {
      const ctx = await loadAgencyContext();
      const site = await getWebsiteForWorkspace(
        ctx.workspace.id,
        parsed.data.websiteId,
      );
      if (!site) {
        return Response.json({ error: "Website not found" }, { status: 404 });
      }
      content = await fetchRemoteLlms(site.url);
    }

    const validation = validateLlmsFile(content);
    return Response.json({ validation });
  } catch {
    return Response.json({ error: "Validation failed" }, { status: 500 });
  }
}
