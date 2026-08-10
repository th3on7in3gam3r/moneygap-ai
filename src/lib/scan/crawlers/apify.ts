import type { ScrapedPage } from "./page-types";
import { classifyCrawlPageType } from "./classify-page";
import { CrawlProviderError } from "./errors";
import { buildApifyActorInput, mapProfileToApifyInput } from "./profiles";
import { buildProgressUpdate } from "./progress";
import type { CrawlInput, CrawlProvider, CrawlResult } from "./types";

const APIFY_API = "https://api.apify.com/v2";
const ACTOR_ID = "apify~website-content-crawler";

export type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED-OUT"
  | "ABORTED"
  | string;

export type ApifyRun = {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  statusMessage?: string | null;
};

export type ApifyDatasetItem = Record<string, unknown>;

function getToken(): string | null {
  const token = process.env.APIFY_API_TOKEN?.trim();
  return token || null;
}

export function isApifyConfigured(): boolean {
  return Boolean(getToken());
}

function crawlLog(event: string, fields: Record<string, unknown>) {
  console.info("[APIFY]", event, fields);
}

async function apifyFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new CrawlProviderError(
      "Apify unavailable: APIFY_API_TOKEN not configured",
      { errorClass: "provider", provider: "apify", retryable: true },
    );
  }

  const { timeoutMs = 30_000, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let res: Response;
  try {
    res = await fetch(`${APIFY_API}${path}`, {
      ...rest,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new CrawlProviderError(
      err instanceof Error ? err.message : "Apify request failed",
      {
        errorClass: "timeout",
        provider: "apify",
        retryable: true,
        cause: err,
      },
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const safe = text.slice(0, 300).replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
    const errorClass =
      res.status === 429
        ? "rate_limit"
        : res.status >= 500
          ? "provider"
          : res.status === 404
            ? "provider"
            : "provider";
    throw new CrawlProviderError(
      `Apify HTTP ${res.status}${safe ? `: ${safe}` : ""}`,
      { errorClass, provider: "apify", retryable: true },
    );
  }

  const json = (await res.json()) as { data?: T } | T;
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function startApifyRun(input: {
  url: string;
  profile: string;
}): Promise<ApifyRun> {
  if (!getToken()) {
    console.warn("Apify unavailable: APIFY_API_TOKEN not configured");
    throw new CrawlProviderError(
      "Apify unavailable: APIFY_API_TOKEN not configured",
      { errorClass: "provider", provider: "apify", retryable: true },
    );
  }

  const actorInput = buildApifyActorInput(input.url, input.profile);
  crawlLog("start", {
    url: input.url,
    profile: input.profile,
    maxCrawlPages: actorInput.maxCrawlPages,
  });

  const run = await apifyFetch<ApifyRun>(`/acts/${ACTOR_ID}/runs`, {
    method: "POST",
    body: JSON.stringify(actorInput),
    timeoutMs: 45_000,
  });

  if (!run?.id) {
    throw new CrawlProviderError("Apify start returned no run id", {
      errorClass: "provider",
      provider: "apify",
      retryable: true,
    });
  }

  crawlLog("started", { runId: run.id, status: run.status });
  return run;
}

export async function getApifyRun(runId: string): Promise<ApifyRun> {
  const run = await apifyFetch<ApifyRun>(`/actor-runs/${encodeURIComponent(runId)}`, {
    method: "GET",
    timeoutMs: 20_000,
  });
  crawlLog("status", { runId, status: run.status, datasetId: run.defaultDatasetId });
  return run;
}

export async function getApifyDatasetItems(
  datasetId: string,
  opts: { limit?: number } = {},
): Promise<ApifyDatasetItem[]> {
  const limit = opts.limit ?? 5_000;
  const items = await apifyFetch<ApifyDatasetItem[]>(
    `/datasets/${encodeURIComponent(datasetId)}/items?format=json&clean=true&limit=${limit}`,
    { method: "GET", timeoutMs: 60_000 },
  );
  const list = Array.isArray(items) ? items : [];
  crawlLog("dataset", { datasetId, items: list.length });
  return list;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Apify dataset item → MoneyGap ScrapedPage.
 * Do not pass raw Apify blobs into the analysis engine.
 */
export function normalizeApifyPage(
  item: ApifyDatasetItem,
  homepageUrl: string,
): ScrapedPage | null {
  if (!item || typeof item !== "object") return null;

  const crawl =
    item.crawl && typeof item.crawl === "object"
      ? (item.crawl as Record<string, unknown>)
      : {};
  const meta =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>)
      : {};

  const url =
    asString(item.url) ||
    asString(crawl.url) ||
    asString(item.loadedUrl) ||
    asString(crawl.loadedUrl) ||
    asString(meta.url);
  if (!url) return null;

  const finalUrl =
    asString(item.loadedUrl) ||
    asString(crawl.loadedUrl) ||
    asString(meta.loadedUrl) ||
    url;

  const markdown =
    asString(item.markdown) ||
    asString(item.text) ||
    asString(meta.markdown) ||
    "";
  if (markdown.trim().length < 40) return null;

  const title =
    asString(item.title) ||
    asString(meta.title) ||
    asString(meta.ogTitle) ||
    null;

  const statusCode =
    asNumber(item.httpStatusCode) ??
    asNumber(crawl.httpStatusCode) ??
    asNumber(meta.statusCode) ??
    asNumber(meta.status) ??
    null;

  const pageType = classifyCrawlPageType(finalUrl, homepageUrl);

  return {
    url: finalUrl,
    pageType,
    title,
    markdown: markdown.slice(0, 24_000),
    metadata: {
      source: "apify",
      originalUrl: url,
      canonical: asString(item.canonicalUrl) || asString(meta.canonicalUrl) || null,
      language: asString(item.language) || asString(meta.language) || null,
      statusCode,
      description: asString(meta.description) || asString(item.description) || null,
      headers:
        item.headers && typeof item.headers === "object"
          ? item.headers
          : undefined,
    },
  };
}

export function normalizeApifyDataset(
  items: ApifyDatasetItem[],
  homepageUrl: string,
): ScrapedPage[] {
  const pages: ScrapedPage[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    try {
      const page = normalizeApifyPage(item, homepageUrl);
      if (!page) continue;
      if (seen.has(page.url)) continue;
      seen.add(page.url);
      pages.push(page);
    } catch {
      // skip malformed rows
    }
  }

  if (pages.length > 0 && !pages.some((p) => p.pageType === "homepage")) {
    pages[0] = { ...pages[0]!, pageType: "homepage" };
  }

  return pages;
}

export function isApifyTerminalFailure(status: string): boolean {
  return (
    status === "FAILED" ||
    status === "TIMED-OUT" ||
    status === "ABORTED" ||
    status === "TIMED_OUT"
  );
}

export function isApifySuccess(status: string): boolean {
  return status === "SUCCEEDED";
}

export function isApifyInProgress(status: string): boolean {
  return status === "READY" || status === "RUNNING";
}

/**
 * Synchronous crawl() for tests / one-shot callers.
 * Production scans use startApifyRun + poll separately (never run-sync).
 */
export const apifyCrawlProvider: CrawlProvider = {
  name: "apify",

  async crawl(input: CrawlInput): Promise<CrawlResult> {
    const started = Date.now();
    await input.onProgress?.(buildProgressUpdate("apify", "starting"));

    const run = await startApifyRun({ url: input.url, profile: input.profile });
    await input.onProgress?.(
      buildProgressUpdate("apify", "running", {
        elapsedMs: Date.now() - started,
      }),
    );

    const deadline = Date.now() + Math.max(30_000, input.timeoutMs);
    let latest = run;

    while (Date.now() < deadline) {
      latest = await getApifyRun(run.id);
      if (isApifySuccess(latest.status) || isApifyTerminalFailure(latest.status)) {
        break;
      }
      await input.onProgress?.(
        buildProgressUpdate("apify", "running", {
          elapsedMs: Date.now() - started,
        }),
      );
      await new Promise((r) => setTimeout(r, 2_500));
    }

    if (isApifyTerminalFailure(latest.status)) {
      throw new CrawlProviderError(`Apify run ${latest.status}`, {
        errorClass: latest.status === "TIMED-OUT" || latest.status === "TIMED_OUT"
          ? "timeout"
          : "provider",
        provider: "apify",
        retryable: true,
      });
    }

    if (!isApifySuccess(latest.status)) {
      throw new CrawlProviderError("Apify run did not finish in time", {
        errorClass: "timeout",
        provider: "apify",
        retryable: true,
      });
    }

    const datasetId = latest.defaultDatasetId;
    if (!datasetId) {
      throw new CrawlProviderError("Apify SUCCEEDED but no dataset id", {
        errorClass: "provider",
        provider: "apify",
        retryable: true,
      });
    }

    await input.onProgress?.(buildProgressUpdate("apify", "retrieving"));
    const items = await getApifyDatasetItems(datasetId, {
      limit: mapProfileToApifyInput(input.profile).maxCrawlPages,
    });

    await input.onProgress?.(buildProgressUpdate("apify", "normalizing"));
    const pages = normalizeApifyDataset(items, input.url);
    const durationMs = Date.now() - started;

    if (pages.length === 0) {
      throw new CrawlProviderError("Apify returned empty dataset", {
        errorClass: "empty",
        provider: "apify",
        retryable: true,
      });
    }

    await input.onProgress?.(
      buildProgressUpdate("apify", "complete", {
        pagesDiscovered: pages.length,
        pagesCompleted: pages.length,
        elapsedMs: durationMs,
      }),
    );

    return {
      provider: "apify",
      pages,
      discovered: pages.length,
      completed: pages.length,
      failed: Math.max(0, items.length - pages.length),
      durationMs,
      partial: false,
      diagnostics: {
        provider: "apify",
        providerRunId: run.id,
        providerDatasetId: datasetId,
        providerStatus: latest.status,
        pagesRequested: mapProfileToApifyInput(input.profile).maxCrawlPages,
        pagesReturned: pages.length,
        durationMs,
      },
    };
  },
};
