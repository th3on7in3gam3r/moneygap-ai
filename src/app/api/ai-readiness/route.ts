import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { websites } from "@/db/schema";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  generateAndStoreLlms,
  summarizeWebsiteAiReadiness,
} from "@/lib/ai-readiness/service";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const url = new URL(req.url);
    const websiteId = url.searchParams.get("websiteId");

    const sites = await db
      .select({
        id: websites.id,
        name: websites.name,
        domain: websites.domain,
        url: websites.url,
      })
      .from(websites)
      .where(eq(websites.workspaceId, ctx.workspace.id))
      .orderBy(asc(websites.name));

    if (!websiteId) {
      return Response.json({ websites: sites });
    }

    const summary = await summarizeWebsiteAiReadiness({
      workspaceId: ctx.workspace.id,
      websiteId,
    });
    if (!summary.ok) {
      return Response.json({ error: summary.error }, { status: 400 });
    }
    return Response.json({ websites: sites, ...summary });
  } catch {
    return Response.json({ error: "Could not load AI Readiness" }, { status: 500 });
  }
}

const postSchema = z.object({
  websiteId: z.string().uuid(),
  confirm: z.literal(true),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body — pass websiteId and confirm: true to regenerate" },
      { status: 400 },
    );
  }

  try {
    const ctx = await loadAgencyContext();
    const result = await generateAndStoreLlms({
      workspaceId: ctx.workspace.id,
      websiteId: parsed.data.websiteId,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({
      content: result.content,
      validation: result.validation,
      version: result.version,
    });
  } catch {
    return Response.json({ error: "Could not generate llms.txt" }, { status: 500 });
  }
}
