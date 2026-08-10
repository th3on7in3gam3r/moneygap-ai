"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ANALYSIS_STAGES } from "@/lib/analysis/stages";
import { cn } from "@/lib/utils";

const STAGE_TIPS: Record<string, string[]> = {
  connecting: [
    "Connecting securely to your site…",
    "Checking DNS and TLS reachability…",
  ],
  reading: [
    "Finding pages worth analyzing…",
    "Reading homepage and key landing pages…",
    "External crawl provider may be fetching pages…",
  ],
  understanding: [
    "Understanding what this business sells…",
    "Mapping products, services, and offers…",
  ],
  extracting: [
    "Extracting offerings and pricing signals…",
    "Looking for monetization opportunities…",
  ],
  audience: [
    "Identifying who this site is built for…",
    "Checking audience and intent signals…",
  ],
  content: [
    "Reviewing content depth and topical coverage…",
    "Looking for FAQ, guide, and blog gaps…",
  ],
  preparing: [
    "Preparing your Growth Opportunity Report…",
    "Organizing MoneyGap Categories™…",
  ],
  detecting_gaps: [
    "Analyzing your conversion paths…",
    "Checking AI visibility signals…",
    "Finding Revenue and Offer gaps…",
  ],
  quantifying: [
    "Scoring Trust, Content, and Technical gaps…",
    "Comparing industry opportunity patterns…",
  ],
  action_plans: [
    "Building your prioritized Fix Roadmap…",
    "Preparing implementation prompts…",
  ],
  discovering_competitors: [
    "Comparing industry opportunities…",
    "Discovering competitive patterns…",
  ],
  profiling_competitors: [
    "Profiling competitor businesses…",
    "Looking for peer growth plays…",
  ],
  competitive_analysis: [
    "Building competitive strategy notes…",
    "Finalizing your Growth Report…",
  ],
};

const STAGE_GROUPS = [
  {
    label: "Discovery",
    ids: ["connecting", "reading"],
  },
  {
    label: "Intelligence",
    ids: ["understanding", "extracting", "audience", "content", "preparing"],
  },
  {
    label: "Opportunity Detection",
    ids: ["detecting_gaps", "quantifying"],
  },
  {
    label: "Scoring",
    ids: [
      "action_plans",
      "discovering_competitors",
      "profiling_competitors",
      "competitive_analysis",
    ],
  },
] as const;

type StageState = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

type StatusPayload = {
  id: string;
  url: string;
  domain: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  progress: number;
  error: string | null;
  reportId: string | null;
  stages: StageState[];
  scanProfile?: string | null;
  scanPhase?: string | null;
  pagesDiscovered?: number;
  pagesCompleted?: number;
  pagesFailed?: number;
  estimatedRemainingMs?: number | null;
  currentUrl?: string | null;
  tickScheduleError?: string | null;
  scanStage?: string | null;
  crawlProvider?: string | null;
  crawlStage?: string | null;
  crawlElapsedMs?: number | null;
  pagesRecovered?: number | null;
  partial?: boolean | null;
};

export function AnalysisProgress({
  analysisId,
  onComplete,
  stayOnComplete = false,
  title = "Analyzing Website",
  eyebrow = "Website intelligence",
  onTryAnotherUrl,
  onRetry,
  onStopped,
}: {
  analysisId: string;
  onComplete?: (reportId: string) => void;
  stayOnComplete?: boolean;
  title?: string;
  eyebrow?: string;
  /** When set (e.g. onboarding), stays in-flow instead of navigating to /dashboard/analyze */
  onTryAnotherUrl?: () => void;
  onRetry?: () => void;
  /** Called after a successful Stop (analysis marked failed). */
  onStopped?: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [tipTick, setTipTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipTick((n) => n + 1), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/analysis/${analysisId}`, { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) {
            setPollError(body.error ?? "Unable to load analysis status.");
          }
          return;
        }
        const payload = (await res.json()) as StatusPayload;
        if (cancelled) return;
        setData(payload);
        setPollError(null);

        if (payload.status === "completed" && payload.reportId) {
          onComplete?.(payload.reportId);
          if (!stayOnComplete) {
            router.replace(`/reports/${payload.reportId}`);
          }
          return;
        }

        if (payload.status !== "failed") {
          timer = setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) {
          setPollError("Connection interrupted. Retrying…");
          timer = setTimeout(poll, 2000);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [analysisId, router, onComplete, stayOnComplete]);

  const stages =
    data?.stages ??
    ANALYSIS_STAGES.map((s, i) => ({
      id: s.id,
      label: s.label,
      done: false,
      active: i === 0,
    }));

  const progress = data?.progress ?? 4;
  const failed = data?.status === "failed";
  const running =
    data?.status === "running" || data?.status === "queued" || !data;

  const activeStageId =
    stages.find((s) => s.active)?.id ?? stages[0]?.id ?? "connecting";
  const tipPool =
    STAGE_TIPS[activeStageId] ??
    STAGE_TIPS.detecting_gaps ??
    ["Discovering Money Gaps™…"];
  const tip = tipPool[tipTick % tipPool.length] ?? tipPool[0]!;
  const activeGroup =
    STAGE_GROUPS.find((g) =>
      (g.ids as readonly string[]).includes(activeStageId),
    )?.label ?? "Intelligence";

  async function stopScan() {
    setStopping(true);
    setPollError(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setPollError(body.error ?? "Could not stop scan.");
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              stage: "Failed",
              error:
                "Scan stopped. You can retry this site or enter a different URL.",
            }
          : prev,
      );
      onStopped?.();
    } finally {
      setStopping(false);
    }
  }

  async function togglePause() {
    setPausing(true);
    try {
      const paused = data?.scanPhase === "paused";
      const res = await fetch(
        `/api/analysis/${analysisId}/${paused ? "resume" : "pause"}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setPollError(body.error ?? "Could not update scan.");
      }
    } finally {
      setPausing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-fg-muted">
          {data?.url ?? "Preparing crawl…"}
        </p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>{failed ? "Analysis stopped" : data?.stage ?? "Queued"}</span>
              <span className="tabular-nums">{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
              <motion.div
                className={cn("h-full rounded-full", failed ? "bg-danger" : "bg-accent")}
                initial={{ width: "4%" }}
                animate={{ width: `${Math.max(4, Math.min(progress, 100))}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {running && !failed ? (
            <div className="rounded-xl border border-accent/25 bg-accent-soft/40 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                {activeGroup}
              </p>
              <p className="mt-1 text-sm font-medium text-fg">{tip}</p>
            </div>
          ) : null}

          {running && !failed ? (
            <div className="flex gap-3 rounded-xl border border-border bg-bg-muted/60 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
              <div className="min-w-0 space-y-1 text-xs leading-relaxed text-fg-muted">
                <p>
                  <span className="font-semibold text-fg">
                    {data?.scanProfile === "quick"
                      ? "Basics (Quick) scan"
                      : data?.scanProfile
                        ? `${data.scanProfile} scan`
                        : "Scan"}
                    :
                  </span>{" "}
                  {data?.crawlProvider === "apify" &&
                  data?.crawlStage === "recovering_pages"
                    ? "Recovering a few difficult pages…"
                    : data?.crawlProvider === "apify"
                    ? "Apify is crawling your site asynchronously — progress updates as pages are discovered."
                    : data?.crawlProvider === "firecrawl"
                      ? data?.pagesRecovered
                        ? "Recovering a few difficult pages…"
                        : "Firecrawl is reading priority pages."
                      : data?.crawlProvider === "scrapedo"
                        ? "Rescuing difficult pages…"
                        : data?.scanPhase === "discovering" ||
                            data?.scanPhase === "processing"
                          ? "Reading pages in small batches so the crawl stays reliable."
                          : data?.scanPhase === "waiting"
                            ? "Your crawl is queued on the MoneyGap crawl worker — this tab can stay open while pages are read."
                            : "Leave this tab open while we crawl pages, score gaps, and build your report."}
                </p>
                {data?.crawlProvider ? (
                  <p className="text-fg">
                    Provider: {data.crawlProvider}
                    {data.crawlStage ? ` · ${data.crawlStage}` : ""}
                    {data.pagesRecovered
                      ? ` · ${data.pagesRecovered} recovered`
                      : ""}
                    {data.partial ? " · partial" : ""}
                    {data.crawlElapsedMs != null && data.crawlElapsedMs > 0
                      ? ` · ${Math.round(data.crawlElapsedMs / 1000)}s elapsed`
                      : ""}
                  </p>
                ) : null}
                {typeof data?.pagesDiscovered === "number" &&
                data.pagesDiscovered > 0 ? (
                  <p className="tabular-nums text-fg">
                    {data.crawlStage === "recovering_pages"
                      ? `Recovering pages… ${data.pagesCompleted ?? 0} ready`
                      : data.crawlProvider === "apify"
                        ? `${data.pagesCompleted ?? 0} of ${data.pagesDiscovered} pages analyzed`
                        : `Reading pages ${data.pagesCompleted ?? 0} of ${data.pagesDiscovered}`}
                    {data.pagesFailed ? ` · ${data.pagesFailed} failed` : ""}
                    {data.estimatedRemainingMs != null &&
                    data.estimatedRemainingMs > 0
                      ? data.estimatedRemainingMs < 60_000
                        ? ` · ~${Math.max(5, Math.round(data.estimatedRemainingMs / 1000))}s remaining`
                        : ` · ~${Math.max(1, Math.round(data.estimatedRemainingMs / 60000))}m remaining`
                      : ""}
                  </p>
                ) : data?.crawlProvider === "apify" ? (
                  <p className="text-fg">
                    {data.stage && !data.stage.toLowerCase().includes("%")
                      ? data.stage
                      : "Apify crawl running…"}
                  </p>
                ) : data?.scanPhase === "discovering" ||
                  data?.stage?.toLowerCase().includes("reading") ||
                  data?.stage?.toLowerCase().includes("sitemap") ? (
                  <p className="text-fg">
                    Discovering pages to read… this usually takes under a minute
                    for Basics scans.
                  </p>
                ) : null}
                {data?.currentUrl ? (
                  <p className="truncate text-fg-subtle">{data.currentUrl}</p>
                ) : null}
                {data?.tickScheduleError ? (
                  <p className="text-gap" role="alert">
                    Crawl continuation issue: {data.tickScheduleError} We are
                    retrying automatically. If this persists, ask your admin to
                    set APP_URL and CRON_SECRET (or enable CRAWL_WORKER_ENABLED
                    with the Render crawl worker), then retry the scan.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <ul className="space-y-3">
            {stages.map((stage, index) => (
              <motion.li
                key={stage.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3.5 py-3"
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  {stage.done || data?.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : stage.active && !failed ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  ) : failed && stage.active ? (
                    <AlertCircle className="h-5 w-5 text-danger" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    stage.done || stage.active ? "text-fg" : "text-fg-subtle",
                  )}
                >
                  {stage.label}
                </span>
              </motion.li>
            ))}
          </ul>

          {pollError && !failed && (
            <p className="text-sm text-fg-muted">{pollError}</p>
          )}

          {running && !failed ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {data?.scanProfile &&
              data.scanProfile !== "quick" &&
              (data.scanPhase === "processing" ||
                data.scanPhase === "discovering" ||
                data.scanPhase === "paused" ||
                data.scanPhase === "waiting") ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pausing || stopping}
                  onClick={() => void togglePause()}
                >
                  {pausing
                    ? "Updating…"
                    : data.scanPhase === "paused"
                      ? "Resume scan"
                      : "Pause scan"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={stopping}
                onClick={() => void stopScan()}
              >
                <Square className="h-3.5 w-3.5" />
                {stopping ? "Stopping…" : "Stop scan"}
              </Button>
              {onTryAnotherUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={stopping}
                  onClick={() => {
                    void (async () => {
                      await stopScan();
                      onTryAnotherUrl();
                    })();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Change URL
                </Button>
              ) : (
                <Button
                  href="/dashboard/analyze"
                  variant="ghost"
                  size="sm"
                  onClick={() => void stopScan()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Change URL
                </Button>
              )}
              {onRetry ? (
                <button
                  type="button"
                  disabled={stopping}
                  onClick={() => {
                    void (async () => {
                      await stopScan();
                      onRetry();
                    })();
                  }}
                  className="inline-flex h-9 items-center rounded-xl px-3.5 text-sm text-fg-muted hover:text-fg disabled:opacity-50"
                >
                  Reset &amp; retry
                </button>
              ) : null}
            </div>
          ) : null}

          {failed && (
            <div className="space-y-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-4">
              <p className="text-sm leading-relaxed text-fg">
                {data?.error ??
                  "We couldn't analyze this website. Please confirm the URL is publicly accessible."}
              </p>
              {data?.tickScheduleError ? (
                <p className="text-xs text-fg-muted" role="status">
                  Crawl worker note: {data.tickScheduleError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {onTryAnotherUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onTryAnotherUrl}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try another URL
                  </Button>
                ) : (
                  <Button href="/dashboard/analyze" variant="secondary" size="sm">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try another URL
                  </Button>
                )}
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex h-9 items-center rounded-xl px-3.5 text-sm text-fg-muted hover:text-fg"
                  >
                    Retry this site
                  </button>
                ) : (
                  <Link
                    href={`/dashboard/analyze?url=${encodeURIComponent(data?.url ?? "")}&profile=quick&auto=1`}
                    className="inline-flex h-9 items-center rounded-xl bg-accent px-3.5 text-sm font-medium text-accent-fg hover:brightness-110"
                  >
                    Retry Basics scan
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
