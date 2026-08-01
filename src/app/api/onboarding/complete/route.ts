import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getFirstResultsSummary,
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  seedWelcomeCopilotMessage,
  updateOnboarding,
} from "@/lib/onboarding";

export async function POST() {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isIntelligentOnboardingEnabled()) {
    return Response.json({ error: "Onboarding disabled" }, { status: 403 });
  }

  const { workspace, userId: dbUserId } = await ensureUserAndWorkspace();
  const row = await getOrCreateOnboarding(workspace.id);
  if (!row) {
    return Response.json({ error: "Onboarding not found" }, { status: 404 });
  }

  let reportId = row.reportId;
  if (!reportId && row.analysisId) {
    const analysis = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, row.analysisId),
    });
    reportId = analysis?.reportId ?? null;
  }

  let welcomeThreadId = row.welcomeThreadId;
  if (!welcomeThreadId) {
    const thread = await seedWelcomeCopilotMessage({
      workspaceId: workspace.id,
      userId: dbUserId,
      personaRole: row.personaRole,
      companyName: row.companyName,
      primaryGoals: row.primaryGoals ?? [],
      reportId,
    });
    welcomeThreadId = thread.id;
  }

  const updated = await updateOnboarding(workspace.id, {
    status: "completed",
    currentStep: "complete",
    completedAt: new Date(),
    reportId,
    welcomeThreadId,
    skippedAt: null,
  });

  const firstResults = reportId ? await getFirstResultsSummary(reportId) : null;

  return Response.json({
    onboarding: updated,
    firstResults,
    welcomeThreadId,
    copilotHref: welcomeThreadId
      ? `/dashboard/copilot?thread=${welcomeThreadId}`
      : "/dashboard/copilot",
  });
}
