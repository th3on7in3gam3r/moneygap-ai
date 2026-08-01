"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Prediction = {
  id: string;
  kind: string;
  title: string;
  prediction: string;
  evidence: string[];
  confidence: number;
  horizon: string;
  recommendedAction: string;
  impactEstimate: {
    labeled: string;
    summary: string;
    scoreDelta?: number;
    revenueDelta?: number;
  } | null;
  status: string;
  websiteId?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
};

type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
  url: string;
};

type Overview = {
  enabled: boolean;
  message: string | null;
  predictions: Prediction[];
  byKind: Record<string, number>;
  openCount: number;
  websites?: WebsiteOption[];
  focusWebsite?: {
    id: string;
    name: string | null;
    domain: string | null;
  } | null;
};

type Scenario = {
  id: string;
  title: string;
  inputs: {
    conversionLiftPct: number;
    trafficGrowthPct: number;
    pricingChangePct: number;
    contentProductionBoostPct: number;
    automationAdoptionPct: number;
  };
  result: {
    labeled: string;
    horizons: {
      horizon: string;
      projectedScoreDelta: number;
      projectedRevenueDelta: number;
      summary: string;
    }[];
    evidence: string[];
    confidence: number;
    recommendedAction: string;
  };
  status: string;
};

const KIND_LABELS: Record<string, string> = {
  growth: "Growth",
  revenue: "Revenue",
  seo_trend: "SEO trend",
  competitive_movement: "Competitive",
  business_risk: "Business risk",
  opportunity: "Opportunity",
  market_signal: "Market signal",
};

export default function PredictiveCenterPage() {
  const [tab, setTab] = useState<"forecasts" | "whatif" | "alerts">("forecasts");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [inputs, setInputs] = useState({
    conversionLiftPct: 10,
    trafficGrowthPct: 15,
    pricingChangePct: 0,
    contentProductionBoostPct: 20,
    automationAdoptionPct: 25,
  });

  function load(activeWebsiteId?: string | null) {
    const wid = activeWebsiteId !== undefined ? activeWebsiteId : websiteId;
    startTransition(() => {
      void (async () => {
        const qs = wid ? `?website=${wid}` : "";
        const [oRes, wRes] = await Promise.all([
          fetch(`/api/predictive${qs}`),
          fetch("/api/predictive/what-if"),
        ]);
        if (!oRes.ok) {
          setError("Could not load Predictive Center");
          return;
        }
        const body = (await oRes.json()) as Overview;
        setOverview(body);
        if (!websiteId && body.focusWebsite?.id) {
          setWebsiteId(body.focusWebsite.id);
        }
        if (wRes.ok) {
          const wBody = (await wRes.json()) as { scenarios: Scenario[] };
          setScenarios(wBody.scenarios ?? []);
        }
        setError(null);
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function selectWebsite(id: string) {
    setWebsiteId(id);
    load(id);
  }

  const focus = overview?.focusWebsite;
  const sites = overview?.websites ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Predictive Intelligence™
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Predictive Center™
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            Forecasts, What-If scenarios, and proactive alerts for a specific
            website. All numeric impacts are AI Estimate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard" size="sm" variant="secondary">
            Overview
          </Button>
          <Button href="/dashboard/executive" size="sm" variant="secondary">
            Executive
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void (async () => {
                  const res = await fetch("/api/predictive/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ websiteId }),
                  });
                  if (!res.ok) {
                    const body = (await res.json()) as { error?: string };
                    setError(body.error ?? "Generate failed");
                    return;
                  }
                  load(websiteId);
                })();
              })
            }
          >
            Refresh forecasts
          </Button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {overview && !overview.enabled && (
        <Card>
          <CardBody className="text-sm text-fg-muted">
            {overview.message ?? "Predictive Intelligence is disabled."}
          </CardBody>
        </Card>
      )}

      {overview?.enabled && (
        <Card>
          <CardBody className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                Forecasts for
              </p>
              {focus ? (
                <>
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    {focus.name ?? "Website"}
                  </h2>
                  <p className="text-sm text-fg-muted">{focus.domain}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-fg-muted">
                  Analyze a website to unlock property-scoped forecasts.
                </p>
              )}
            </div>
            {sites.length > 1 ? (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {sites.map((site) => {
                  const active = (websiteId ?? focus?.id) === site.id;
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => selectWebsite(site.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-fg-muted hover:border-border-strong hover:text-fg"
                      }`}
                    >
                      {site.name}
                      <span className="ml-1.5 text-fg-subtle">{site.domain}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {focus ? (
              <Link
                href={`/dashboard/analytics?website=${focus.id}`}
                className="inline-flex text-sm font-medium text-accent hover:underline"
              >
                Open analytics for this site →
              </Link>
            ) : (
              <Link
                href="/dashboard/analyze"
                className="inline-flex text-sm font-medium text-accent hover:underline"
              >
                Analyze a website →
              </Link>
            )}
          </CardBody>
        </Card>
      )}

      {overview?.enabled && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-bg-elevated px-4 py-3.5 shadow-[var(--shadow)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
              Open forecasts
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">
              {overview.openCount}
            </p>
            {focus?.domain ? (
              <p className="mt-1 truncate text-[11px] text-fg-subtle">
                {focus.domain}
              </p>
            ) : null}
          </div>
          {Object.entries(overview.byKind)
            .slice(0, 3)
            .map(([kind, n]) => (
              <div
                key={kind}
                className="rounded-2xl border border-border bg-bg-elevated px-4 py-3.5 shadow-[var(--shadow)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  {KIND_LABELS[kind] ?? kind}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">
                  {n}
                </p>
              </div>
            ))}
        </section>
      )}

      <div
        role="tablist"
        className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-bg-muted/60 p-1"
      >
        {(
          [
            ["forecasts", "Forecasts"],
            ["whatif", "What-If"],
            ["alerts", "Alerts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-bg-elevated text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "forecasts" && (
        <div className="space-y-3">
          {!overview?.predictions.length && (
            <Card>
              <CardBody className="text-sm text-fg-muted">
                No forecasts yet for{" "}
                <span className="font-medium text-fg">
                  {focus?.domain ?? "this workspace"}
                </span>
                . Click{" "}
                <span className="font-medium text-fg">Refresh forecasts</span>{" "}
                to generate them.
              </CardBody>
            </Card>
          )}
          {(overview?.predictions ?? []).map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(p.websiteDomain || p.websiteName) && (
                      <Badge tone="accent">
                        {p.websiteDomain ?? p.websiteName}
                      </Badge>
                    )}
                    <Badge tone="neutral">{KIND_LABELS[p.kind] ?? p.kind}</Badge>
                    <Badge tone="accent">{p.horizon}</Badge>
                    <Badge tone="neutral">Confidence {p.confidence}</Badge>
                    <Badge tone="gap">
                      {p.impactEstimate?.labeled ?? "AI Estimate"}
                    </Badge>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-semibold text-fg">
                    {p.title}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => {
                        void (async () => {
                          await fetch(`/api/predictive/predictions/${p.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "dismissed" }),
                          });
                          load(websiteId);
                        })();
                      })
                    }
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => {
                        void (async () => {
                          await fetch(`/api/predictive/predictions/${p.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "acted" }),
                          });
                          load(websiteId);
                        })();
                      })
                    }
                  >
                    Mark acted
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 pt-0">
                <p className="text-sm leading-relaxed text-fg">{p.prediction}</p>
                {p.impactEstimate?.summary && (
                  <p className="text-xs text-fg-muted">
                    {p.impactEstimate.summary}
                  </p>
                )}
                <ul className="space-y-1 text-xs text-fg-subtle">
                  {p.evidence.slice(0, 4).map((e) => (
                    <li key={e} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                      {e}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-fg">
                  Recommended: {p.recommendedAction}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === "whatif" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                What-If Simulator™
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Uses baselines from{" "}
                <span className="font-medium text-fg">
                  {focus?.domain ?? "the selected website"}
                </span>
                . Results are AI Estimate drafts.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["conversionLiftPct", "Conversion lift %"],
                  ["trafficGrowthPct", "Traffic growth %"],
                  ["pricingChangePct", "Pricing change %"],
                  ["contentProductionBoostPct", "Content boost %"],
                  ["automationAdoptionPct", "Automation adoption %"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                    {label}
                  </span>
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void (async () => {
                    const res = await fetch("/api/predictive/what-if", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        inputs,
                        websiteId,
                      }),
                    });
                    if (!res.ok) {
                      const body = (await res.json()) as { error?: string };
                      setError(body.error ?? "What-If failed");
                      return;
                    }
                    load(websiteId);
                  })();
                })
              }
            >
              Run scenario
            </Button>

            {!scenarios.length && (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
                No scenarios yet. Adjust levers and run a draft.
              </p>
            )}

            <ul className="space-y-3">
              {scenarios.map((s) => (
                <li
                  key={s.id}
                  className="rounded-2xl border border-border bg-bg px-4 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{s.title}</p>
                    <Badge tone="accent">{s.result.labeled}</Badge>
                    <Badge tone="neutral">
                      Confidence {s.result.confidence}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {s.result.horizons.map((h) => (
                      <div
                        key={h.horizon}
                        className="rounded-xl border border-border bg-bg-elevated px-3 py-2"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                          {h.horizon}
                        </p>
                        <p className="mt-1 text-xs text-fg-muted">{h.summary}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-fg-muted">
                    {s.result.recommendedAction}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {tab === "alerts" && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                Predictive Alerts™
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                High-confidence alerts for{" "}
                <span className="font-medium text-fg">
                  {focus?.domain ?? "the selected website"}
                </span>
                .
              </p>
            </div>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void (async () => {
                    const res = await fetch("/api/predictive/alerts/sync", {
                      method: "POST",
                    });
                    if (!res.ok) {
                      const body = (await res.json()) as { error?: string };
                      setError(body.error ?? "Alert sync failed");
                      return;
                    }
                    load(websiteId);
                  })();
                })
              }
            >
              Sync alerts
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-fg-muted">
              Open notifications in the shell for delivered{" "}
              <code className="text-xs">predictive_*</code> alerts. Candidates
              below meet confidence ≥ 55.
            </p>
            <ul className="space-y-2">
              {(overview?.predictions ?? [])
                .filter(
                  (p) =>
                    [
                      "business_risk",
                      "revenue",
                      "competitive_movement",
                      "seo_trend",
                    ].includes(p.kind) && p.confidence >= 55,
                )
                .map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-border px-3 py-2.5 text-sm"
                  >
                    {(p.websiteDomain || p.websiteName) && (
                      <span className="mr-2 rounded-md bg-bg-muted px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                        {p.websiteDomain ?? p.websiteName}
                      </span>
                    )}
                    <span className="font-medium text-fg">{p.title}</span>
                    <span className="ml-2 text-xs text-fg-muted">
                      {KIND_LABELS[p.kind]} · {p.confidence}% · {p.horizon}
                    </span>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
