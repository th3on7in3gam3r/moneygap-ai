"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Prompts = {
  cursor: string;
  chatgpt: string;
  claude: string;
  gemini: string;
  copilot: string;
};

type Finding = {
  id: string;
  category: string;
  title: string;
  problem: string;
  businessImpact: string;
  whyItMatters: string;
  estimatedOpportunity: number | null;
  estimateLabeled: string;
  confidence: number;
  evidence: string[] | null;
  fixPath: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  verificationSteps: string[] | null;
  prompts: Prompts | null;
  pageUrl: string | null;
  opportunityId: string | null;
  reportId: string | null;
};

type Draft = {
  id: string;
  pageUrl: string;
  status: string;
  proposedTitle: string | null;
  proposedDescription: string | null;
  snippet: string | null;
  currentTitle: string | null;
  currentDescription: string | null;
};

type Overview = {
  enabled: boolean;
  message: string | null;
  targetUrl: string;
  targetSource: string;
  scores: {
    overall: number | null;
    seo: number | null;
    trust: number | null;
    conversion: number | null;
    performance: number | null;
    aiVisibility: number | null;
    contentCoverage: number | null;
    backlinkHealth: number | null;
    crawlability: number | null;
    crawlabilityStatus?: string | null;
    crawlabilityContributors?: Record<string, number | null> | null;
    crawlabilitySummary?: string | null;
    crawlabilityEstimatedImprovement?: string | null;
    unavailableReasons: Record<string, string>;
    estimatedOpportunity: number | null;
    labeled: string;
  } | null;
  latestScan: {
    id: string;
    status: string;
    summary: string | null;
    error?: string | null;
    targetUrl: string;
    reportId: string | null;
    websiteId: string | null;
    finishedAt: string | null;
    createdAt: string;
  } | null;
  trend: {
    date: string;
    overall: number | null;
    seo: number | null;
    trust: number | null;
    conversion: number | null;
    crawlability?: number | null;
  }[];
  deltas: Record<string, number | null>;
  crawlability?: {
    score: number | null;
    status: string | null;
    contributors: Record<string, number | null> | null;
    summary: string | null;
    estimatedImprovement: string | null;
    previous: number | null;
    delta: number | null;
  } | null;
  findings: Finding[];
  drafts: Draft[];
  stats: {
    dailyCount: number;
    weeklyCount: number;
    monthlyCount: number;
    resolvedHint: string;
  };
};

const SCORE_LABELS: { key: keyof NonNullable<Overview["scores"]>; label: string }[] = [
  { key: "overall", label: "Overall Growth" },
  { key: "crawlability", label: "Crawlability Score™" },
  { key: "seo", label: "SEO" },
  { key: "trust", label: "Trust" },
  { key: "conversion", label: "Conversion" },
  { key: "performance", label: "Performance" },
  { key: "aiVisibility", label: "AI Visibility" },
  { key: "contentCoverage", label: "Content Coverage" },
  { key: "backlinkHealth", label: "Backlink Health" },
];

const PROMPT_KEYS: (keyof Prompts)[] = [
  "cursor",
  "chatgpt",
  "claude",
  "gemini",
  "copilot",
];

export default function SelfOptimizationPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [promptTab, setPromptTab] = useState<keyof Prompts>("cursor");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/self-optimization");
          const body = (await res.json()) as Overview & { error?: string };
          if (!res.ok) {
            setError(body.error ?? "Could not load Self Optimization™");
            return;
          }
          setData(body);
          if (body.latestScan?.status === "failed" && body.latestScan.error) {
            setError(body.latestScan.error);
          } else if (body.latestScan?.status === "running") {
            setError(null);
          } else {
            setError(null);
          }
        } catch {
          setError("Could not load Self Optimization™");
        }
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, []);

  // Poll while a scan is running (server also auto-fails stale "running" rows ~90s)
  useEffect(() => {
    if (data?.latestScan?.status !== "running") return;
    const id = setInterval(() => load(), 2500);
    const giveUp = setTimeout(() => {
      setError(
        "Scan is taking longer than expected. Refresh and try again — a stuck run will auto-clear shortly.",
      );
      load();
    }, 100_000);
    return () => {
      clearInterval(id);
      clearTimeout(giveUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll on running status
  }, [data?.latestScan?.status, data?.latestScan?.id]);

  function runScan() {
    startTransition(() => {
      void (async () => {
        setError(null);
        const res = await fetch("/api/self-optimization", { method: "POST" });
        const body = (await res.json()) as {
          ok?: boolean;
          started?: boolean;
          message?: string;
          error?: string;
        };
        if (!res.ok || body.ok === false) {
          setError(body.message ?? body.error ?? "Scan failed");
          return;
        }
        load();
      })();
    });
  }

  function applyDraft(draftId: string) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/self-optimization/metadata/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, action: "apply" }),
        });
        load();
      })();
    });
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const reasons = data?.scores?.unavailableReasons ?? {};

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Self Optimization™
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Growth Score Center
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
            MoneyGap continuously scans its own site for Money Gaps, SEO,
            trust, conversion, and AI visibility — then generates Fix Paths™ and
            ready-to-copy AI prompts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard" size="sm" variant="secondary">
            Overview
          </Button>
          <Button href="/dashboard/money-gaps" size="sm" variant="secondary">
            Money Gaps
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              pending ||
              data?.enabled === false ||
              data?.latestScan?.status === "running"
            }
            onClick={runScan}
          >
            {data?.latestScan?.status === "running"
              ? "Scanning…"
              : pending
                ? "Working…"
                : "Run self scan"}
          </Button>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      )}

      {data && !data.enabled && (
        <Card>
          <CardBody className="py-8 text-center">
            <p className="font-display text-lg font-semibold">Setup required</p>
            <p className="mt-2 text-sm text-fg-muted">
              {data.message ?? "Self Optimization™ is not enabled for this workspace."}
            </p>
          </CardBody>
        </Card>
      )}

      {data?.enabled && (
        <>
          <Card>
            <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                  Scan target
                </p>
                <a
                  href={data.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  {data.targetUrl}
                </a>
                <p className="text-xs text-fg-subtle">
                  Source: {data.targetSource}
                  {data.latestScan
                    ? ` · Last scan ${data.latestScan.status} · ${data.latestScan.summary ?? ""}`
                    : " · No scans yet — run a self scan to populate scores"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">AI Estimate</Badge>
                {data.latestScan?.reportId ? (
                  <Button
                    href={`/reports/${data.latestScan.reportId}`}
                    size="sm"
                    variant="secondary"
                  >
                    Linked report
                  </Button>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCORE_LABELS.map(({ key, label }) => {
              if (
                key === "unavailableReasons" ||
                key === "estimatedOpportunity" ||
                key === "labeled" ||
                key === "crawlabilityStatus" ||
                key === "crawlabilityContributors" ||
                key === "crawlabilitySummary" ||
                key === "crawlabilityEstimatedImprovement"
              ) {
                return null;
              }
              const value = data.scores?.[key] as number | null | undefined;
              const reason = reasons[key === "aiVisibility" ? "aiVisibility" : String(key)];
              const isCrawl = key === "crawlability";
              const status = isCrawl ? data.scores?.crawlabilityStatus : null;
              const body = (
                  <CardBody className="py-4">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                      {label}
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                      {value != null ? value : "—"}
                      {value != null ? (
                        <span className="ml-1 text-sm font-medium text-fg-subtle">
                          /100
                        </span>
                      ) : null}
                    </p>
                    {status ? (
                      <p className="mt-1 text-xs font-medium text-fg-muted">{status}</p>
                    ) : null}
                    {value == null && reason ? (
                      <p className="mt-1 text-[11px] leading-snug text-fg-muted">
                        {reason}
                      </p>
                    ) : null}
                    {isCrawl ? (
                      <p className="mt-2 text-[11px] text-accent">Open Crawlability Report →</p>
                    ) : null}
                  </CardBody>
              );
              return isCrawl ? (
                <a key={key} href="/dashboard/self-optimization/crawlability" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <Card className="transition hover:border-accent/40">{body}</Card>
                </a>
              ) : (
                <Card key={key}>{body}</Card>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                  Estimated opportunity
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-gap">
                  {data.scores?.estimatedOpportunity != null
                    ? formatCurrency(data.scores.estimatedOpportunity)
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Projection · {data.scores?.labeled ?? "AI Estimate"}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                  Scans (7d / 30d)
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {data.stats.weeklyCount} / {data.stats.monthlyCount}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                  Score deltas vs prior
                </p>
                <p className="mt-1 text-sm text-fg-muted">
                  Overall{" "}
                  {data.deltas.overall != null
                    ? `${data.deltas.overall > 0 ? "+" : ""}${data.deltas.overall}`
                    : "—"}
                  {" · "}SEO{" "}
                  {data.deltas.seo != null
                    ? `${data.deltas.seo > 0 ? "+" : ""}${data.deltas.seo}`
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  {data.stats.resolvedHint}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-display text-lg font-semibold">Score trend</h2>
                <p className="text-sm text-fg-muted">
                  Real scan history only — empty until two or more scans exist
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {data.trend.length >= 2 ? (
                <ul className="space-y-2">
                  {data.trend.map((p) => (
                    <li
                      key={p.date}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-fg-muted">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-muted">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{
                              width: `${Math.min(100, p.overall ?? 0)}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right font-display font-semibold tabular-nums">
                          {p.overall ?? "—"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
                  Run another self scan to unlock trend charts from real history.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                Opportunities & Fix Paths™
              </h2>
              <Badge tone="neutral">{data.findings.length}</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.findings.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  No findings yet. Run a self scan against {data.targetUrl}.
                </p>
              ) : (
                data.findings.map((f) => {
                  const open = expanded === f.id;
                  return (
                    <div
                      key={f.id}
                      className="rounded-xl border border-border px-4 py-3"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 text-left"
                        onClick={() => setExpanded(open ? null : f.id)}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="gap">{f.category}</Badge>
                            <span className="text-[11px] text-fg-subtle">
                              Confidence {f.confidence}
                            </span>
                          </div>
                          <p className="font-medium text-fg">{f.title}</p>
                        </div>
                        {f.estimatedOpportunity != null ? (
                          <p className="shrink-0 font-display text-sm font-semibold tabular-nums text-gap">
                            {formatCurrency(f.estimatedOpportunity)}
                          </p>
                        ) : null}
                      </button>
                      {open && (
                        <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
                          <p>
                            <span className="text-fg-subtle">Problem · </span>
                            {f.problem}
                          </p>
                          <p>
                            <span className="text-fg-subtle">Impact · </span>
                            {f.businessImpact}
                          </p>
                          <p>
                            <span className="text-fg-subtle">Why · </span>
                            {f.whyItMatters}
                          </p>
                          <p>
                            <span className="text-fg-subtle">Fix Path™ · </span>
                            {f.fixPath}
                          </p>
                          <p className="text-xs text-fg-subtle">
                            {f.difficulty} · {f.estimatedTime} · {f.estimateLabeled}
                          </p>
                          {f.evidence && f.evidence.length > 0 ? (
                            <ul className="list-inside list-disc text-xs text-fg-muted">
                              {f.evidence.map((e) => (
                                <li key={e}>{e}</li>
                              ))}
                            </ul>
                          ) : null}
                          {f.verificationSteps && f.verificationSteps.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                                Verification
                              </p>
                              <ul className="mt-1 list-inside list-disc text-xs text-fg-muted">
                                {f.verificationSteps.map((s) => (
                                  <li key={s}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {f.prompts ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                                AI Prompt Engine™
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {PROMPT_KEYS.map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    onClick={() => setPromptTab(k)}
                                    className={`rounded-md border px-2 py-1 text-[11px] capitalize ${
                                      promptTab === k
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-border text-fg-muted"
                                    }`}
                                  >
                                    {k}
                                  </button>
                                ))}
                              </div>
                              <pre className="max-h-48 overflow-auto rounded-lg bg-bg-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
                                {f.prompts[promptTab]}
                              </pre>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  void copyText(f.id, f.prompts![promptTab])
                                }
                              >
                                {copied === f.id ? "Copied" : "Copy prompt"}
                              </Button>
                            </div>
                          ) : null}
                          {f.reportId && f.opportunityId ? (
                            <a
                              href={`/reports/${f.reportId}?focus=${f.opportunityId}`}
                              className="inline-flex text-sm font-medium text-accent hover:underline"
                            >
                              Open in report →
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Metadata Engine™ drafts
                </h2>
                <p className="text-sm text-fg-muted">
                  Preview before apply — never auto-publishes to production
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.drafts.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  Metadata drafts appear after a successful self scan.
                </p>
              ) : (
                data.drafts.map((d) => (
                  <div
                    key={d.id}
                    className="space-y-2 rounded-xl border border-border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{d.pageUrl}</p>
                      <Badge tone={d.status === "applied" ? "accent" : "neutral"}>
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-fg-muted">
                      Current: {d.currentTitle ?? "—"}
                    </p>
                    <p className="text-sm">
                      Proposed: <strong>{d.proposedTitle}</strong>
                    </p>
                    <p className="text-xs text-fg-muted">{d.proposedDescription}</p>
                    {d.snippet ? (
                      <pre className="max-h-32 overflow-auto rounded-lg bg-bg-muted p-2 text-[10px] whitespace-pre-wrap">
                        {d.snippet}
                      </pre>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {d.snippet ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void copyText(`draft-${d.id}`, d.snippet!)}
                        >
                          {copied === `draft-${d.id}` ? "Copied" : "Copy snippet"}
                        </Button>
                      ) : null}
                      {d.status === "draft" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => applyDraft(d.id)}
                          disabled={pending}
                        >
                          Confirm apply
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      )}

      {!data && pending && (
        <p className="text-sm text-fg-muted" aria-live="polite">
          Loading Self Optimization™…
        </p>
      )}
    </div>
  );
}
