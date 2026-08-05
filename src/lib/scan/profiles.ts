import type { ScanProfile, ScanProfileConfig } from "./types";

export const SCAN_PROFILES: Record<ScanProfile, ScanProfileConfig> = {
  quick: {
    id: "quick",
    label: "Quick Scan",
    description: "Fast overview of homepage and key marketing pages.",
    crawlerMode: "quick",
    maxPages: 30,
    batchSize: 10,
    concurrency: 5,
    maxDepth: 2,
    secondsPerPage: 0.35,
  },
  standard: {
    id: "standard",
    label: "Standard Scan",
    description: "General audit with sitemap and internal links (up to 50 pages).",
    crawlerMode: "standard",
    maxPages: 50,
    batchSize: 10,
    concurrency: 5,
    maxDepth: 2,
    secondsPerPage: 0.55,
  },
  deep: {
    id: "deep",
    label: "Deep Scan",
    description: "Resumable crawl of discovered pages (up to 5,000).",
    crawlerMode: "deep",
    maxPages: 5_000,
    batchSize: 8,
    concurrency: 5,
    maxDepth: 6,
    secondsPerPage: 0.65,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise Scan",
    description: "Large-site incremental crawl with adaptive batching (soft cap 50k).",
    crawlerMode: "deep",
    maxPages: 50_000,
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

export function estimateEtaSeconds(
  profile: ScanProfile,
  estimatedPages: number,
): number {
  const cfg = getScanProfile(profile);
  const pages = Math.min(Math.max(1, estimatedPages), cfg.maxPages);
  const parallelFactor = Math.max(1, cfg.concurrency * 0.65);
  return Math.max(5, Math.round((pages * cfg.secondsPerPage) / parallelFactor));
}

export function recommendProfile(estimatedPages: number, complexity: "low" | "medium" | "high"): ScanProfile {
  if (estimatedPages <= 40 && complexity === "low") return "quick";
  if (estimatedPages <= 400) return "standard";
  if (estimatedPages <= 8_000) return "deep";
  return "enterprise";
}
