import type { ScanProfile, ScanProfileConfig } from "./types";

export const SCAN_PROFILES: Record<ScanProfile, ScanProfileConfig> = {
  quick: {
    id: "quick",
    label: "Quick Scan",
    description: "Fast overview of homepage and key marketing pages.",
    crawlerMode: "quick",
    maxPages: 25,
    batchSize: 10,
    concurrency: 5,
    maxDepth: 2,
    secondsPerPage: 0.35,
  },
  standard: {
    id: "standard",
    label: "Standard Growth Scan",
    description: "General audit with sitemap and internal links (up to 100 pages).",
    crawlerMode: "standard",
    maxPages: 100,
    batchSize: 10,
    concurrency: 5,
    maxDepth: 2,
    secondsPerPage: 0.55,
  },
  deep: {
    id: "deep",
    label: "Deep Intelligence Scan",
    description: "Resumable crawl of discovered pages (up to 500).",
    crawlerMode: "deep",
    maxPages: 500,
    batchSize: 8,
    concurrency: 5,
    maxDepth: 6,
    secondsPerPage: 0.65,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise Scan",
    description: "Large-site incremental crawl with adaptive batching (soft cap 5k).",
    crawlerMode: "deep",
    maxPages: 5_000,
    batchSize: 15,
    concurrency: 8,
    maxDepth: 12,
    secondsPerPage: 0.7,
  },
};

export const SCAN_PROFILE_IDS = Object.keys(SCAN_PROFILES) as ScanProfile[];

export function isScanProfile(v: unknown): v is ScanProfile {
  return typeof v === "string" && v in SCAN_PROFILES;
}

export function getScanProfile(id: ScanProfile | string | null | undefined): ScanProfileConfig {
  if (id && isScanProfile(id)) return SCAN_PROFILES[id];
  return SCAN_PROFILES.standard;
}

export function formatEtaSeconds(seconds: number): string {
  if (seconds < 15) return `~${Math.max(3, Math.round(seconds))} seconds`;
  if (seconds < 90) return `~${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 10) return `~${minutes.toFixed(1)} minutes`;
  return `~${Math.round(minutes)}+ minutes`;
}

const PROFILE_ETA_ORDER: ScanProfile[] = [
  "quick",
  "standard",
  "deep",
  "enterprise",
];

function estimateEtaSecondsRaw(
  profile: ScanProfile,
  estimatedPages: number,
): number {
  const cfg = getScanProfile(profile);
  const pages = Math.min(Math.max(1, estimatedPages), cfg.maxPages);
  // Modest parallelism — do not let high concurrency invert heavier profiles.
  const parallelFactor = Math.min(2.5, Math.max(1, Math.sqrt(cfg.concurrency)));
  return Math.max(5, Math.round((pages * cfg.secondsPerPage) / parallelFactor));
}

/**
 * Pre-scan ETA for a profile. Heavier profiles never estimate faster than
 * lighter ones for the same discovered page count (Enterprise is not "quicker").
 */
export function estimateEtaSeconds(
  profile: ScanProfile,
  estimatedPages: number,
): number {
  const idx = PROFILE_ETA_ORDER.indexOf(profile);
  let seconds = estimateEtaSecondsRaw(profile, estimatedPages);
  for (let i = 0; i < idx; i++) {
    const lighter = estimateEtaSecondsRaw(PROFILE_ETA_ORDER[i]!, estimatedPages);
    // Keep a clear step up vs lighter tiers for the same site size.
    seconds = Math.max(seconds, Math.round(lighter * 1.12) + 3);
  }
  return seconds;
}

export function recommendProfile(estimatedPages: number, complexity: "low" | "medium" | "high"): ScanProfile {
  if (estimatedPages <= 40 && complexity === "low") return "quick";
  if (estimatedPages <= 400) return "standard";
  if (estimatedPages <= 8_000) return "deep";
  return "enterprise";
}
