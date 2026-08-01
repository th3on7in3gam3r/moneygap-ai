import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  reports,
  workspaceOnboarding,
  type DiscoverySignals,
  type OnboardingPersonaRole,
  type OnboardingStatus,
  type OnboardingStepId,
  type WorkspaceOnboarding,
} from "@/db/schema";
import { isIntelligentOnboardingEnabled } from "@/lib/onboarding/flag";

export async function getOrCreateOnboarding(
  workspaceId: string,
): Promise<WorkspaceOnboarding | null> {
  if (!isIntelligentOnboardingEnabled()) return null;

  const existing = await db.query.workspaceOnboarding.findFirst({
    where: eq(workspaceOnboarding.workspaceId, workspaceId),
  });
  if (existing) return existing;

  // Existing workspaces with reports should not be forced through first-run.
  const [reportRow] = await db
    .select({ value: count() })
    .from(reports)
    .where(eq(reports.workspaceId, workspaceId));
  const hasReports = Number(reportRow?.value ?? 0) > 0;

  try {
    const [row] = await db
      .insert(workspaceOnboarding)
      .values(
        hasReports
          ? {
              workspaceId,
              status: "completed",
              currentStep: "complete",
              completedAt: new Date(),
            }
          : { workspaceId },
      )
      .returning();
    return row!;
  } catch {
    return (
      (await db.query.workspaceOnboarding.findFirst({
        where: eq(workspaceOnboarding.workspaceId, workspaceId),
      })) ?? null
    );
  }
}

export async function updateOnboarding(
  workspaceId: string,
  patch: Partial<{
    status: OnboardingStatus;
    currentStep: OnboardingStepId;
    personaRole: OnboardingPersonaRole | null;
    primaryWebsiteUrl: string | null;
    discoverySignals: DiscoverySignals | null;
    companyName: string | null;
    industry: string | null;
    businessModel: string | null;
    teamSize: string | null;
    primaryGoals: string[];
    analysisId: string | null;
    reportId: string | null;
    welcomeThreadId: string | null;
    checklistDismissed: string[];
    remindersDismissed: string[];
    demoExploredAt: Date | null;
    completedAt: Date | null;
    skippedAt: Date | null;
    replayCount: number;
    celebrationShown: string[];
  }>,
): Promise<WorkspaceOnboarding | null> {
  await getOrCreateOnboarding(workspaceId);
  const [row] = await db
    .update(workspaceOnboarding)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(workspaceOnboarding.workspaceId, workspaceId))
    .returning();
  return row ?? null;
}

export function shouldGateToOnboarding(
  row: WorkspaceOnboarding | null | undefined,
): boolean {
  if (!isIntelligentOnboardingEnabled()) return false;
  if (!row) return true;
  return row.status === "not_started" || row.status === "in_progress";
}
