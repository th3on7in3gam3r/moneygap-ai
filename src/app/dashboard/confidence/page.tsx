"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Site = { id: string; name: string; domain: string; url?: string };

type Overview = {
  enabled: boolean;
  overall: number | null;
  engines: {
    business: number;
    developer: number;
    data: number;
    benchmark: number;
    ai: number;
  } | null;
  lowConfidenceCount?: number;
  riskDistribution?: { low: number; medium: number; high: number } | null;
  recommendationCount?: number | null;
  lowConfidence: {
    id: string;
    title: string;
    overall: number;
    riskLevel: string;
    reportId: string;
    websiteId?: string | null;
    websiteName?: string | null;
    websiteDomain?: string | null;
  }[];
  history: {
    id: string;
    overallScore: number;
    lowConfidenceCount: number;
    createdAt: string;
    reportId: string | null;
  }[];
  websites?: Site[];
  focusWebsite?: { id: string; name: string; domain: string } | null;
  message: string | null;
};

type Rec = {
  id: string;
  reportId: string;
  title: string;
  category: string;
  overall: number;
  engines: Overview["engines"];
  risk: { level: string; summary: string };
  impact: { labeled: string; summary: string };
  websiteId?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
};

const ENGINE_LABELS: Record<string, string> = {
  business: "Business",
  developer: "Developer",
  data: "Data",
  benchmark: "Benchmark",
  ai: "AI",
};

function SiteBadge({
  domain,
  name,
}: {
  domain?: string | null;
  name?: string | null;
}) {
  const label = domain || name;
  if (!label) return null;
  return <Badge tone="accent">{label}</Badge>;
}

export default function ConfidenceCenterPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const applyOverview = useCallback(
    (body: Overview & { recommendations?: Rec[] }) => {
      setData(body);
      if (body.recommendations) {
        setRecs(body.recommendations);
      }
      if (body.focusWebsite?.id) {
        setWebsiteId((prev) => prev ?? body.focusWebsite!.id);
      }
      setError(null);
    },
    [],
  );

  const load = useCallback(async (activeWebsiteId?: string | null) => {
    const wid = activeWebsiteId !== undefined ? activeWebsiteId : websiteId;
    setPending(true);
    setStatus(null);
    try {
      const qs = wid ? `?website=${wid}` : "";
      const [oRes, rRes] = await Promise.all([
        fetch(`/api/confidence${qs}`),
        fetch(`/api/confidence/recommendations${qs}`),
      ]);
      if (!oRes.ok) {
        setError("Could not load Confidence Center");
        return;
      }
      const overview = (await oRes.json()) as Overview;
      setData(overview);
      if (!websiteId && overview.focusWebsite?.id) {
        setWebsiteId(overview.focusWebsite.id);
      }
      if (rRes.ok) {
        const body = (await rRes.json()) as { recommendations: Rec[] };
        setRecs(body.recommendations ?? []);
      }
      setError(null);
    } catch {
      setError("Could not load Confidence Center");
    } finally {
      setPending(false);
    }
  }, [websiteId]);

  const refresh = useCallback(async () => {
    setPending(true);
    setStatus(null);
    setError(null);
    try {
      const qs = websiteId ? `?website=${websiteId}` : "";
      const res = await fetch(`/api/confidence${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not refresh Confidence Center");
        return;
      }
      const body = (await res.json()) as Overview & {
        recommendations?: Rec[];
        refreshed?: boolean;
        refreshMessage?: string | null;
      };
      applyOverview(body);
      setStatus(
        body.refreshed
          ? "Snapshot refreshed from latest report."
          : body.refreshMessage ?? "Nothing new to refresh.",
      );
    } catch {
      setError("Could not refresh Confidence Center");
    } finally {
      setPending(false);
    }
  }, [applyOverview, websiteId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function selectWebsite(id: string) {
    setWebsiteId(id);
    void load(id);
  }

  const focus = data?.focusWebsite;
  const sites = data?.websites ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Confidence & Implementation Intelligence™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
          Confidence Center™
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Overall recommendation confidence, engine breakdown, history, and
          low-confidence callouts—so you can act with evidence and estimated
          impact in view.
        </p>
      </header>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {status && (
        <p className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-fg">
          {status}
        </p>
      )}

      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              Showing for
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
                Analyze a website to unlock property-scoped confidence.
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
        </CardBody>
      </Card>

      {data?.message && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
            <p>{data.message}</p>
            <Button href="/dashboard/analyze" size="sm" variant="secondary">
              Run analysis
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Overall</h2>
            {data?.overall != null && (
              <Badge tone="accent">{data.overall}%</Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            <p>
              Recommendations in latest snapshot:{" "}
              {data?.recommendationCount ?? "—"}
            </p>
            <p>Low confidence: {data?.lowConfidenceCount ?? "—"}</p>
            {data?.riskDistribution && (
              <p>
                Risk mix — low {data.riskDistribution.low} · medium{" "}
                {data.riskDistribution.medium} · high{" "}
                {data.riskDistribution.high}
              </p>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => void refresh()}
            >
              {pending ? "Refreshing…" : "Refresh"}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              Engine breakdown
            </h2>
          </CardHeader>
          <CardBody>
            {!data?.engines ? (
              <p className="text-sm text-fg-muted">No engine averages yet.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(data.engines).map(([k, v]) => (
                  <li
                    key={k}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-fg-muted">
                      {ENGINE_LABELS[k] ?? k} Confidence™
                    </span>
                    <span className="font-medium tabular-nums text-fg">{v}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">
            Low confidence areas
          </h2>
        </CardHeader>
        <CardBody>
          {!data?.lowConfidence.length ? (
            <p className="text-sm text-fg-muted">
              No low-confidence recommendations in recent reports.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.lowConfidence.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{r.title}</p>
                      <SiteBadge
                        domain={r.websiteDomain}
                        name={r.websiteName}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">
                      {r.overall}% · risk {r.riskLevel}
                    </p>
                  </div>
                  <Button
                    href={`/reports/${r.reportId}`}
                    size="sm"
                    variant="secondary"
                  >
                    Open report
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">
            Recommendations
          </h2>
        </CardHeader>
        <CardBody>
          {!recs.length ? (
            <p className="text-sm text-fg-muted">
              No Confidence Intelligence payloads yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {recs.slice(0, 40).map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-border px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{r.title}</p>
                      <SiteBadge
                        domain={r.websiteDomain}
                        name={r.websiteName}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Badge tone="accent">{r.overall}%</Badge>
                      <Badge tone="neutral">risk {r.risk.level}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">{r.impact.summary}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                    Estimated outcomes
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">
            Confidence history
          </h2>
        </CardHeader>
        <CardBody>
          {!data?.history.length ? (
            <p className="text-sm text-fg-muted">No snapshots yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-fg-muted">
              {data.history.map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {new Date(h.createdAt).toLocaleString()} · overall{" "}
                    <span className="text-fg">{h.overallScore}%</span>
                  </span>
                  <span>low: {h.lowConfidenceCount}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
