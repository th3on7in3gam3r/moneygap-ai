import { checkCrawlability } from "./crawlability.js";
import { fetchPage } from "./fetch.js";
import { checkPerfHeuristics, extractTitle } from "./performance.js";
import { checkSchema } from "./schema.js";
import { scoreFindings } from "./score.js";
import type {
  DiagnosticStage,
  LiveDiagnosticsOptions,
  LiveDiagnosticsResult,
} from "./types.js";
import { normalizePublicUrl } from "./url.js";

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_MAX_HTML = 1_500_000;

function stage(
  id: DiagnosticStage["id"],
  label: string,
  status: DiagnosticStage["status"],
): DiagnosticStage {
  return { id, label, status };
}

export async function runLiveDiagnostics(
  inputUrl: string,
  options: LiveDiagnosticsOptions = {},
): Promise<
  | { ok: true; result: LiveDiagnosticsResult }
  | { ok: false; error: string; result?: LiveDiagnosticsResult }
> {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML;
  const onStage = options.onStage;

  const normalized = normalizePublicUrl(inputUrl);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  const stages: DiagnosticStage[] = [
    stage("fetching", "Fetching page", "pending"),
    stage("crawlability", "Checking crawlability", "pending"),
    stage("schema", "Validating schema", "pending"),
    stage("performance", "Performance signals", "pending"),
    stage("scoring", "Scoring", "pending"),
  ];

  const emit = (id: DiagnosticStage["id"], status: DiagnosticStage["status"]) => {
    const s = stages.find((x) => x.id === id);
    if (!s) return;
    s.status = status;
    onStage?.({ ...s });
  };

  emit("fetching", "running");
  const pageRes = await fetchPage(normalized.href, {
    timeoutMs,
    maxHtmlBytes,
    userAgent: options.userAgent,
  });

  if (!pageRes.ok) {
    emit("fetching", "error");
    const result: LiveDiagnosticsResult = {
      url: normalized.href,
      finalUrl: normalized.href,
      score: 0,
      findings: pageRes.findings,
      stages,
      durationMs: Date.now() - started,
      meta: {
        title: null,
        statusCode: 0,
        htmlBytes: 0,
        hasJsonLd: false,
        schemaTypes: [],
      },
    };
    return { ok: false, error: pageRes.error, result };
  }

  emit("fetching", "done");
  const { page } = pageRes;

  emit("crawlability", "running");
  const crawlFindings = await checkCrawlability(normalized.origin, {
    timeoutMs,
    userAgent: options.userAgent,
  });
  emit("crawlability", "done");

  emit("schema", "running");
  const schema = checkSchema(page.html);
  emit("schema", "done");

  emit("performance", "running");
  const perfFindings = checkPerfHeuristics(page.html);
  emit("performance", "done");

  emit("scoring", "running");
  const findings = [...crawlFindings, ...schema.findings, ...perfFindings];
  const score = scoreFindings(findings);
  emit("scoring", "done");

  const result: LiveDiagnosticsResult = {
    url: normalized.href,
    finalUrl: page.finalUrl,
    score,
    findings,
    stages,
    durationMs: Date.now() - started,
    meta: {
      title: extractTitle(page.html),
      statusCode: page.statusCode,
      htmlBytes: page.bytes,
      hasJsonLd: schema.hasJsonLd,
      schemaTypes: schema.schemaTypes,
    },
  };

  return { ok: true, result };
}

export { normalizePublicUrl, isPrivateHostname } from "./url.js";
export { scoreFindings, hasCriticalFailures } from "./score.js";
export { SANDBOX_STORAGE_KEY } from "./types.js";
export type * from "./types.js";
