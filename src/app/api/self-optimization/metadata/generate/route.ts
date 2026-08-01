import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { selfOptimizationMetadataDrafts } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { fetchPageSeo } from "@/lib/self-optimization/seo/scan-html";
import { proposeMetadata } from "@/lib/self-optimization/metadata/generate";
import { validateAndNormalizeUrl } from "@/lib/analysis/url";

const schema = z.object({
  pageUrl: z.string().url(),
  scanId: z.string().uuid().optional(),
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
      return Response.json({ error: "pageUrl required" }, { status: 400 });
    }

    const validated = validateAndNormalizeUrl(body.data.pageUrl);
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    const page = await fetchPageSeo(validated.value.href);
    if (page.status !== 200) {
      return Response.json(
        {
          error: "Page unreachable",
          status: page.status,
          message: "Cannot generate metadata without a live HTML response.",
        },
        { status: 422 },
      );
    }

    const proposal = proposeMetadata(page);
    const [draft] = await db
      .insert(selfOptimizationMetadataDrafts)
      .values({
        workspaceId: workspace.id,
        scanId: body.data.scanId ?? null,
        pageUrl: proposal.pageUrl,
        currentTitle: proposal.currentTitle,
        currentDescription: proposal.currentDescription,
        currentOg: proposal.currentOg,
        currentTwitter: proposal.currentTwitter,
        currentCanonical: proposal.currentCanonical,
        currentJsonLd: proposal.currentJsonLd,
        proposedTitle: proposal.proposedTitle,
        proposedDescription: proposal.proposedDescription,
        proposedOg: proposal.proposedOg,
        proposedTwitter: proposal.proposedTwitter,
        proposedCanonical: proposal.proposedCanonical,
        proposedJsonLd: proposal.proposedJsonLd,
        snippet: proposal.snippet,
        status: "draft",
      })
      .returning();

    return Response.json({
      ok: true,
      draft,
      labeled: "Preview only — confirm before apply. Never auto-publishes.",
    });
  } catch (err) {
    return Response.json(
      { error: "Metadata generate failed", detail: String(err) },
      { status: 500 },
    );
  }
}
