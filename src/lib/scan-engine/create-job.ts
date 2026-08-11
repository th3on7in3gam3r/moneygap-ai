import { eq } from "drizzle-orm";
import {
  firstIncompleteRequired,
  stagesForProfile,
  type ScanProfileId,
  type ScanStageId,
} from "moneygap-scan-engine";
import { db } from "@/db";
import {
  scanJobs,
  scanJobStages,
  websiteAnalyses,
  websitePages,
} from "@/db/schema";
import { log } from "@/lib/observability/logger";

function asProfile(p: string | null | undefined): ScanProfileId {
  if (p === "quick" || p === "standard" || p === "deep" || p === "enterprise") {
    return p;
  }
  return "quick";
}

/**
 * Create durable scan_jobs + stages for an analysis. Idempotent if job exists.
 */
export async function createScanJobForAnalysis(analysisId: string): Promise<{
  scanJobId: string;
  created: boolean;
}> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { id: true, scanProfile: true, scanMeta: true },
  });
  if (!analysis) throw new Error("analysis_missing");

  const existing = await db.query.scanJobs.findFirst({
    where: eq(scanJobs.analysisId, analysisId),
  });
  if (existing) {
    return { scanJobId: existing.id, created: false };
  }

  const profile = asProfile(analysis.scanProfile);
  const stagePlan = stagesForProfile(profile);

  const [job] = await db
    .insert(scanJobs)
    .values({
      analysisId,
      profile,
      status: "queued",
      currentStage: "acquire",
      metadata: { engine: "v3" },
    })
    .returning();

  await db.insert(scanJobStages).values(
    stagePlan.map((s) => ({
      scanJobId: job!.id,
      stage: s.id,
      status: s.initialStatus,
      completedAt: s.initialStatus === "skipped" ? new Date() : null,
      metadata: { mode: s.mode },
    })),
  );

  await db
    .update(websiteAnalyses)
    .set({
      status: "running",
      scanPhase: "queued",
      stage: "Queued for Scan Engine",
      progress: 2,
      scanMeta: {
        ...((analysis.scanMeta as Record<string, unknown>) ?? {}),
        scanEngine: "v3",
        scanJobId: job!.id,
      },
    })
    .where(eq(websiteAnalyses.id, analysisId));

  log("info", "SCAN_CREATED", {
    analysisId,
    scanJobId: job!.id,
    profile,
    stages: stagePlan.map((s) => `${s.id}:${s.initialStatus}`),
  });

  return { scanJobId: job!.id, created: true };
}

export async function cancelScanJob(analysisId: string): Promise<void> {
  const job = await db.query.scanJobs.findFirst({
    where: eq(scanJobs.analysisId, analysisId),
  });
  if (!job) return;
  await db
    .update(scanJobs)
    .set({
      status: "cancelled",
      completedAt: new Date(),
      errorClass: "CANCELLED",
      errorMessage: "Stopped by user",
    })
    .where(eq(scanJobs.id, job.id));

  const open = await db.query.scanJobStages.findMany({
    where: eq(scanJobStages.scanJobId, job.id),
  });
  for (const s of open) {
    if (
      s.status === "queued" ||
      s.status === "pending" ||
      s.status === "running"
    ) {
      await db
        .update(scanJobStages)
        .set({
          status: "skipped",
          completedAt: new Date(),
          leaseExpiresAt: null,
        })
        .where(eq(scanJobStages.id, s.id));
    }
  }

  await db
    .update(websiteAnalyses)
    .set({
      status: "failed",
      scanPhase: "failed",
      stage: "Stopped",
      error: "Scan stopped",
      completedAt: new Date(),
    })
    .where(eq(websiteAnalyses.id, analysisId));
}

export async function resumeScanJob(analysisId: string): Promise<{
  ok: boolean;
  reason: string;
}> {
  const job = await db.query.scanJobs.findFirst({
    where: eq(scanJobs.analysisId, analysisId),
  });
  if (!job) return { ok: false, reason: "no_job" };
  if (job.status === "cancelled") return { ok: false, reason: "cancelled" };

  const stages = await db.query.scanJobStages.findMany({
    where: eq(scanJobStages.scanJobId, job.id),
  });

  const pages = await db.query.websitePages.findMany({
    where: eq(websitePages.analysisId, analysisId),
    columns: { id: true },
    limit: 1,
  });
  const hasPages = pages.length > 0;

  // Never re-ACQUIRE if pages already exist — mark acquire complete and resume next.
  const acquire = stages.find((s) => s.stage === "acquire");
  if (
    hasPages &&
    acquire &&
    (acquire.status === "failed" ||
      acquire.status === "queued" ||
      acquire.status === "running" ||
      acquire.status === "pending")
  ) {
    await db
      .update(scanJobStages)
      .set({
        status: "completed",
        completedAt: new Date(),
        leaseExpiresAt: null,
        claimedAt: null,
        errorClass: null,
        errorMessage: null,
        metadata: {
          ...((acquire.metadata as Record<string, unknown>) ?? {}),
          resumedSkipReacquire: true,
        },
      })
      .where(eq(scanJobStages.id, acquire.id));
  }

  const refreshed = await db.query.scanJobStages.findMany({
    where: eq(scanJobStages.scanJobId, job.id),
  });
  const byStage = Object.fromEntries(
    refreshed.map((s) => [s.stage, s.status]),
  ) as Partial<Record<ScanStageId, string>>;

  const resumeTarget =
    firstIncompleteRequired(
      byStage as Parameters<typeof firstIncompleteRequired>[0],
    ) ??
    refreshed.find(
      (s) =>
        s.status === "failed" ||
        s.status === "queued" ||
        s.status === "pending" ||
        s.status === "running",
    )?.stage ??
    null;

  if (!resumeTarget) {
    return { ok: false, reason: "nothing_to_resume" };
  }

  // Reset failed/running target to queued; keep prior completed stages.
  for (const s of refreshed) {
    if (s.stage === resumeTarget) {
      await db
        .update(scanJobStages)
        .set({
          status: "queued",
          leaseExpiresAt: null,
          claimedAt: null,
          errorClass: null,
          errorMessage: null,
        })
        .where(eq(scanJobStages.id, s.id));
    } else if (
      s.status === "queued" ||
      s.status === "running" ||
      s.status === "failed"
    ) {
      // Later stages wait as pending until advance enqueues them.
      const order = [
        "acquire",
        "normalize",
        "intelligence",
        "moneygap",
        "findings",
        "roadmap",
        "competitive",
        "finalize",
      ];
      const ti = order.indexOf(resumeTarget);
      const si = order.indexOf(s.stage);
      if (si > ti) {
        await db
          .update(scanJobStages)
          .set({
            status: "pending",
            leaseExpiresAt: null,
            claimedAt: null,
          })
          .where(eq(scanJobStages.id, s.id));
      }
    }
  }

  await db
    .update(scanJobs)
    .set({
      status: "queued",
      currentStage: resumeTarget,
      errorClass: null,
      errorMessage: null,
      completedAt: null,
    })
    .where(eq(scanJobs.id, job.id));

  await db
    .update(websiteAnalyses)
    .set({
      status: "running",
      error: null,
      scanPhase: "queued",
      stage: "Resuming scan",
    })
    .where(eq(websiteAnalyses.id, analysisId));

  return { ok: true, reason: `resume_${resumeTarget}` };
}

export async function getScanJobStatus(analysisId: string) {
  const job = await db.query.scanJobs.findFirst({
    where: eq(scanJobs.analysisId, analysisId),
  });
  if (!job) return null;
  const stages = await db.query.scanJobStages.findMany({
    where: eq(scanJobStages.scanJobId, job.id),
  });
  return { job, stages };
}

export type { ScanStageId };
