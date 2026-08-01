import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.redirect(new URL("/sign-in", _req.url));
  }

  const { id } = await context.params;
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
  });

  if (!analysis?.reportId || analysis.status !== "completed") {
    return NextResponse.redirect(new URL(`/dashboard/analyze/${id}`, _req.url));
  }

  return NextResponse.redirect(new URL(`/reports/${analysis.reportId}`, _req.url));
}
