/** Canonical Scan Engine V3 stages (execution order). */
export const SCAN_STAGES = [
  "acquire",
  "normalize",
  "intelligence",
  "moneygap",
  "findings",
  "roadmap",
  "competitive",
  "finalize",
] as const;

export type ScanStageId = (typeof SCAN_STAGES)[number];

export type ScanJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

export type ScanStageStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "skipped";

export type ScanProfileId = "quick" | "standard" | "deep" | "enterprise";

export type StageMode = "full" | "lite" | "skip";

export type StageDefinition = {
  id: ScanStageId;
  label: string;
  /** Weight toward overall progress (sums to 100). */
  weight: number;
  required: boolean;
};

export const STAGE_DEFS: StageDefinition[] = [
  { id: "acquire", label: "Website Acquisition", weight: 20, required: true },
  { id: "normalize", label: "Normalize Content", weight: 8, required: true },
  { id: "intelligence", label: "Business Intelligence", weight: 18, required: true },
  { id: "moneygap", label: "MoneyGap Analysis", weight: 18, required: true },
  { id: "findings", label: "Deep Findings", weight: 10, required: false },
  { id: "roadmap", label: "Fix Roadmap", weight: 12, required: false },
  { id: "competitive", label: "Competitive Intelligence", weight: 8, required: false },
  { id: "finalize", label: "Report", weight: 6, required: true },
];

/** Profile → stage mode. Basics (quick) skips competitive and lites heavy stages. */
export const PROFILE_STAGE_MATRIX: Record<
  ScanProfileId,
  Record<ScanStageId, StageMode>
> = {
  quick: {
    acquire: "full",
    normalize: "full",
    intelligence: "lite",
    moneygap: "lite",
    findings: "lite",
    roadmap: "lite",
    competitive: "skip",
    finalize: "full",
  },
  standard: {
    acquire: "full",
    normalize: "full",
    intelligence: "full",
    moneygap: "full",
    findings: "full",
    roadmap: "full",
    competitive: "full",
    finalize: "full",
  },
  deep: {
    acquire: "full",
    normalize: "full",
    intelligence: "full",
    moneygap: "full",
    findings: "full",
    roadmap: "full",
    competitive: "full",
    finalize: "full",
  },
  enterprise: {
    acquire: "full",
    normalize: "full",
    intelligence: "full",
    moneygap: "full",
    findings: "full",
    roadmap: "full",
    competitive: "full",
    finalize: "full",
  },
};

/** Stage wall deadlines (ms) by profile. */
export const STAGE_DEADLINE_MS: Record<
  ScanProfileId,
  Record<ScanStageId, number>
> = {
  quick: {
    acquire: 90_000,
    normalize: 30_000,
    intelligence: 90_000,
    moneygap: 120_000,
    findings: 45_000,
    roadmap: 30_000,
    competitive: 15_000,
    finalize: 30_000,
  },
  standard: {
    acquire: 10 * 60_000,
    normalize: 60_000,
    intelligence: 180_000,
    moneygap: 5 * 60_000,
    findings: 120_000,
    roadmap: 90_000,
    competitive: 4 * 60_000,
    finalize: 60_000,
  },
  deep: {
    acquire: 20 * 60_000,
    normalize: 90_000,
    intelligence: 240_000,
    moneygap: 8 * 60_000,
    findings: 180_000,
    roadmap: 120_000,
    competitive: 8 * 60_000,
    finalize: 60_000,
  },
  enterprise: {
    acquire: 45 * 60_000,
    normalize: 120_000,
    intelligence: 300_000,
    moneygap: 12 * 60_000,
    findings: 240_000,
    roadmap: 180_000,
    competitive: 12 * 60_000,
    finalize: 90_000,
  },
};

export const DEFAULT_LEASE_MS = 90_000;
export const HEARTBEAT_INTERVAL_MS = 20_000;

export function stagesForProfile(profile: ScanProfileId): Array<{
  id: ScanStageId;
  mode: StageMode;
  initialStatus: ScanStageStatus;
}> {
  const matrix = PROFILE_STAGE_MATRIX[profile] ?? PROFILE_STAGE_MATRIX.standard;
  let queuedFirst = false;
  return SCAN_STAGES.map((id) => {
    const mode = matrix[id];
    if (mode === "skip") {
      return { id, mode, initialStatus: "skipped" as const };
    }
    // Only the first runnable stage starts queued; others wait as pending.
    if (!queuedFirst) {
      queuedFirst = true;
      return { id, mode, initialStatus: "queued" as const };
    }
    return { id, mode, initialStatus: "pending" as const };
  });
}

export function computeProgress(
  stageStatuses: Partial<Record<ScanStageId, ScanStageStatus>>,
): number {
  let done = 0;
  let total = 0;
  for (const def of STAGE_DEFS) {
    total += def.weight;
    const st = stageStatuses[def.id];
    if (st === "completed" || st === "skipped" || st === "partial") {
      done += def.weight;
    } else if (st === "running") {
      done += def.weight * 0.4;
    }
  }
  return Math.min(99, Math.round((done / Math.max(1, total)) * 100));
}

export function firstIncompleteRequired(
  stageStatuses: Partial<Record<ScanStageId, ScanStageStatus>>,
): ScanStageId | null {
  for (const def of STAGE_DEFS) {
    if (!def.required) continue;
    const st = stageStatuses[def.id];
    if (st !== "completed" && st !== "skipped") return def.id;
  }
  for (const def of STAGE_DEFS) {
    const st = stageStatuses[def.id];
    if (st === "failed" || st === "queued" || st === "pending" || st === "running") {
      if (PROFILE_STAGE_MATRIX.standard[def.id] !== "skip") return def.id;
    }
  }
  return null;
}

export function isScanEngineV3Enabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env.SCAN_ENGINE_V3?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
