import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import type { AssetSection } from "@/db/schema";
import { generatedAssets } from "@/db/schema";
import { assertReportAccess } from "@/lib/advisor/context";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ reportId: string; id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId, id } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const asset = await db.query.generatedAssets.findFirst({
    where: and(eq(generatedAssets.id, id), eq(generatedAssets.reportId, reportId)),
  });
  if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });

  const body = (await req.json()) as {
    title?: string;
    content?: AssetSection[];
    status?: "draft" | "saved";
  };

  const [updated] = await db
    .update(generatedAssets)
    .set({
      ...(body.title ? { title: body.title } : {}),
      ...(body.content ? { content: body.content } : {}),
      ...(body.status ? { status: body.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(generatedAssets.id, id))
    .returning();

  return Response.json({ asset: updated });
}
