import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { ScanCommandCenter } from "@/components/analysis/scan-command-center";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { isV3AnalysisMeta } from "@/lib/scan-engine/status";

export const metadata: Metadata = {
  title: "Scan Command Center",
};

export default async function ScanCommandCenterPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    redirect("/sign-in");
  }

  const { scanId } = await params;
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: and(
      eq(websiteAnalyses.id, scanId),
      eq(websiteAnalyses.userId, userId),
    ),
    columns: { id: true, scanMeta: true, reportId: true, status: true },
  });

  if (!analysis) {
    redirect("/dashboard/analyze");
  }

  // Legacy scans keep the classic progress page.
  if (!isV3AnalysisMeta(analysis.scanMeta)) {
    redirect(`/dashboard/analyze/${scanId}`);
  }

  if (analysis.status === "completed" && analysis.reportId) {
    redirect(`/reports/${analysis.reportId}`);
  }

  return (
    <div className="w-full py-2">
      <ScanCommandCenter scanId={scanId} />
    </div>
  );
}
