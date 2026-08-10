export type RoadmapErrorClass =
  | "ROADMAP_AI_TIMEOUT"
  | "ROADMAP_AI_RATE_LIMIT"
  | "ROADMAP_INVALID_JSON"
  | "ROADMAP_CONTEXT_LIMIT"
  | "ROADMAP_PERSIST_ERROR"
  | "ROADMAP_DEADLINE"
  | "ROADMAP_CLAIM_LOST";

import { classifyAiError, type AiErrorClass } from "@/lib/analysis/ai-errors";

export function classifyRoadmapError(err: unknown): RoadmapErrorClass {
  const msg = err instanceof Error ? err.message : String(err);
  if (/deadline|envelope/i.test(msg)) return "ROADMAP_DEADLINE";
  if (/claim|lost.?race|already.?running/i.test(msg)) return "ROADMAP_CLAIM_LOST";

  const base: AiErrorClass = classifyAiError(err);
  switch (base) {
    case "AI_TIMEOUT":
      return "ROADMAP_AI_TIMEOUT";
    case "AI_RATE_LIMIT":
      return "ROADMAP_AI_RATE_LIMIT";
    case "AI_INVALID_JSON":
    case "REPORT_VALIDATION_ERROR":
      return "ROADMAP_INVALID_JSON";
    case "AI_CONTEXT_LIMIT":
      return "ROADMAP_CONTEXT_LIMIT";
    case "DATABASE_WRITE_ERROR":
      return "ROADMAP_PERSIST_ERROR";
    default:
      return "ROADMAP_PERSIST_ERROR";
  }
}

/** Fresh claim window — resume must not start a second engine while progressing. */
export const MONEYGAP_CLAIM_FRESH_MS = 6 * 60_000;

export function isMoneyGapClaimFresh(input: {
  claimedAt: number | null;
  lastProgressAt: number | null;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (input.claimedAt == null) return false;
  if (now - input.claimedAt >= MONEYGAP_CLAIM_FRESH_MS) return false;
  if (
    input.lastProgressAt != null &&
    now - input.lastProgressAt >= MONEYGAP_CLAIM_FRESH_MS
  ) {
    return false;
  }
  return true;
}

/** Default wall clock for Money Gap modules + roadmap persist (~4.5m). */
export const DEFAULT_MONEYGAP_ENGINE_DEADLINE_MS = 4.5 * 60_000;

export function getMoneyGapEngineDeadlineMs(): number {
  const raw = Number(process.env.MONEYGAP_ENGINE_DEADLINE_MS);
  if (Number.isFinite(raw) && raw >= 60_000) return raw;
  return DEFAULT_MONEYGAP_ENGINE_DEADLINE_MS;
}

/** Max opportunities persisted to keep reports bounded. */
export const MAX_PERSISTED_OPPORTUNITIES = 20;

/** Per-module corpus excerpt for LLM (compact; not full crawl dump). */
export const MODULE_CORPUS_MAX_CHARS = 24_000;
