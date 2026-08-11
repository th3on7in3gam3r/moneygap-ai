import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { isV3AnalysisMeta } from "@/lib/scan-engine/status";

export default async function AnalysisProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, isAuthenticated } = await auth();
  if (isAuthenticated && userId) {
    const analysis = await db.query.websiteAnalyses.findFirst({
      where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
      columns: { scanMeta: true },
    });
    if (analysis && isV3AnalysisMeta(analysis.scanMeta)) {
      redirect(`/dashboard/scans/${id}`);
    }
  }
  return <AnalysisProgress analysisId={id} />;
}
