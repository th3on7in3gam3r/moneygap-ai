"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

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
  priority: string | null;
  verificationSteps: string[] | null;
  pageUrl: string | null;
};

type Payload = {
  score: number | null;
  status: string | null;
  contributors: Record<string, number | null> | null;
  summary: string | null;
  estimatedImprovement: string | null;
  previous: number | null;
  delta: number | null;
  unavailableReasons: Record<string, string>;
  findings: Finding[];
  trend: { date: string; crawlability: number | null }[];
};

const CONTRIBUTOR_LABELS: Record<string, string> = {
  robots: "robots.txt",
  sitemap: "Sitemap",
  canonical: "Canonical",
  internalLinks: "Internal Links",
  redirects: "Redirects",
  indexability: "Indexability",
};

export default function CrawlabilityReportPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/self-optimization");
          const body = await res.json();
          if (!res.ok) {
            setError(body.error ?? "Could not load Crawlability Report");
            return;
          }
          const crawlFindings = (body.findings as Finding[]).filter(
            (f) => f.category === "crawlability",
          );
          setData({
            score: body.scores?.crawlability ?? body.crawlability?.score ?? null,
            status:
              body.scores?.crawlabilityStatus ?? body.crawlability?.status ?? null,
            contributors:
              body.scores?.crawlabilityContributors ??
              body.crawlability?.contributors ??
              null,
            summary:
              body.scores?.crawlabilitySummary ?? body.crawlability?.summary ?? null,
            estimatedImprovement:
              body.scores?.crawlabilityEstimatedImprovement ??
              body.crawlability?.estimatedImprovement ??
              null,
            previous: body.crawlability?.previous ?? null,
            delta: body.crawlability?.delta ?? body.deltas?.crawlability ?? null,
            unavailableReasons: body.scores?.unavailableReasons ?? {},
            findings: crawlFindings,
            trend: (body.trend ?? []).map(
              (t: { date: string; crawlability?: number | null }) => ({
                date: t.date,
                crawlability: t.crawlability ?? null,
              }),
            ),
          });
          setError(null);
        } catch {
          setError("Could not load Crawlability Report");
        }
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, []);

  const reasons = Object.entries(data?.unavailableReasons ?? {}).filter(([k]) =>
    k.startsWith("crawlability"),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Technical SEO Intelligence™
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Crawlability Report
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
            Crawlability Score™ measures how easily search engines and AI systems
            can discover, crawl, and understand your site — with evidence-backed
            Fix Paths™.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard/self-optimization" size="sm" variant="secondary">
            Score Center
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={load}>
            {pending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Crawlability Score™
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
              {data?.score != null ? data.score : "—"}
              {data?.score != null ? (
                <span className="ml-1 text-sm font-medium text-fg-subtle">/100</span>
              ) : null}
            </p>
            {data?.status ? (
              <Badge tone="accent" className="mt-2">
                {data.status}
              </Badge>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Previous scan
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {data?.previous != null ? data.previous : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Improvement
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {data?.delta != null
                ? `${data.delta > 0 ? "+" : ""}${data.delta}`
                : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Issues
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {data?.findings.length ?? 0}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Executive summary</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p>{data?.summary ?? "Run a self scan to generate Crawlability Score™."}</p>
          {data?.estimatedImprovement ? (
            <p className="text-fg">
              <span className="font-medium">Estimated improvement: </span>
              {data.estimatedImprovement}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Score breakdown</h2>
          <p className="text-xs text-fg-subtle">Contributors</p>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CONTRIBUTOR_LABELS).map(([key, label]) => {
            const v = data?.contributors?.[key] ?? null;
            return (
              <div key={key} className="rounded-xl border border-border px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                  {label}
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {v != null ? `${v}/100` : "—"}
                </p>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {reasons.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Not evaluated</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            {reasons.map(([k, v]) => (
              <p key={k}>{v}</p>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Detected issues</h2>
          <p className="text-xs text-fg-subtle">
            Priority · Fix Path™ · verification checklist
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          {(data?.findings ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted">
              No crawlability findings yet. Run a self scan from Score Center.
            </p>
          ) : (
            data!.findings.map((f) => {
              const open = expanded === f.id;
              return (
                <div key={f.id} className="rounded-xl border border-border">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setExpanded(open ? null : f.id)}
                  >
                    <div>
                      <p className="font-medium text-fg">{f.title}</p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {(f.priority ?? "medium").toUpperCase()} · Confidence{" "}
                        {f.confidence}%
                        {f.estimatedOpportunity != null
                          ? ` · ${formatCurrency(f.estimatedOpportunity)} AI Estimate`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-fg-subtle">{open ? "Hide" : "Details"}</span>
                  </button>
                  {open ? (
                    <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase text-fg-subtle">Problem</p>
                        <p className="mt-1 text-fg-muted">{f.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-fg-subtle">
                          Why it matters
                        </p>
                        <p className="mt-1 text-fg-muted">{f.whyItMatters}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-fg-subtle">
                          Estimated business impact
                        </p>
                        <p className="mt-1 text-fg-muted">{f.businessImpact}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-fg-subtle">Evidence</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-fg-muted">
                          {(f.evidence ?? []).map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-fg-subtle">
                          Fix Path™
                        </p>
                        <p className="mt-1 text-fg">{f.fixPath}</p>
                        <p className="mt-1 text-xs text-fg-subtle">
                          {f.difficulty} · {f.estimatedTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-fg-subtle">
                          Verification checklist
                        </p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-fg-muted">
                          {(f.verificationSteps ?? []).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Historical trend</h2>
        </CardHeader>
        <CardBody className="space-y-1 text-sm text-fg-muted">
          {(data?.trend ?? []).length === 0 ? (
            <p>Need completed scans to show trend.</p>
          ) : (
            data!.trend.map((t) => (
              <p key={t.date} className="flex justify-between gap-4 tabular-nums">
                <span>{new Date(t.date).toLocaleString()}</span>
                <span>{t.crawlability != null ? `${t.crawlability}/100` : "—"}</span>
              </p>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
