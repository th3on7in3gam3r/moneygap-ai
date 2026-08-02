"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type SiteFields = {
  websiteId?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
};

type Payload = {
  progressSummary: string;
  growthScore: number | null;
  topPriorities: ({ id: string; title: string } & SiteFields)[];
  completed: ({ id: string; title: string } & SiteFields)[];
  recommendations: ({ id: string; title: string; moduleId?: string } & SiteFields)[];
  automationHealth: {
    queueDepth: number;
    workflowDrafts: number;
    workflowRuns: number;
    activeSprint: string | null;
  };
  monitorBriefSnippet?: string | null;
  focusWebsite?: { id: string; name: string; domain: string } | null;
};

type Briefing = {
  id: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  payload: Payload;
};

type Site = { id: string; name: string; domain: string; url?: string };

function SiteBadge({ item }: { item: SiteFields }) {
  const label = item.websiteDomain || item.websiteName;
  if (!label) return null;
  return <Badge tone="accent">{label}</Badge>;
}

export default function ExecutiveBriefingPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [websites, setWebsites] = useState<Site[]>([]);
  const [focusWebsite, setFocusWebsite] = useState<{
    id: string;
    name: string;
    domain: string;
  } | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load(activeWebsiteId?: string | null) {
    const wid = activeWebsiteId !== undefined ? activeWebsiteId : websiteId;
    startTransition(() => {
      void (async () => {
        const qs = wid ? `?website=${wid}` : "";
        const res = await fetch(`/api/automation/briefings${qs}`);
        if (!res.ok) {
          setError("Could not load briefings");
          return;
        }
        const body = (await res.json()) as {
          briefings: Briefing[];
          websites?: Site[];
          focusWebsite?: { id: string; name: string; domain: string } | null;
        };
        setBriefings(body.briefings ?? []);
        setWebsites(body.websites ?? []);
        setFocusWebsite(body.focusWebsite ?? null);
        if (!websiteId && body.focusWebsite?.id) {
          setWebsiteId(body.focusWebsite.id);
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

  const latest = briefings[0];
  const focus = focusWebsite;
  const sites = websites;

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Executive Briefing™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
          Executive AI Briefing™
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Weekly leadership rollup: progress, growth score, priorities,
          completed improvements, AI recommendations, and automation health.
          Also linked from{" "}
          <a href="/dashboard/team" className="text-accent hover:underline">
            Team Workspace™
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard/automation" size="sm" variant="secondary">
            Automation Studio
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void (async () => {
                  const res = await fetch("/api/automation/briefings", {
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
            Generate this week
          </Button>
        </div>
      </header>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
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
                Analyze a website to unlock property-scoped briefings.
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

      {!latest ? (
        <Card>
          <CardBody className="text-sm text-fg-muted">
            No briefings yet. Generate one after you have reports and a queue.
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">
                  Growth score
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-3xl font-semibold tabular-nums text-fg">
                  {latest.payload.growthScore ?? "—"}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">MoneyGap Score™</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">
                  Automation health
                </h2>
              </CardHeader>
              <CardBody className="space-y-1 text-sm text-fg-muted">
                <p>Queue depth: {latest.payload.automationHealth.queueDepth}</p>
                <p>
                  Workflow drafts:{" "}
                  {latest.payload.automationHealth.workflowDrafts}
                </p>
                <p>Runs: {latest.payload.automationHealth.workflowRuns}</p>
                <p>
                  Sprint:{" "}
                  {latest.payload.automationHealth.activeSprint ?? "None"}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">Period</h2>
              </CardHeader>
              <CardBody className="text-sm text-fg-muted">
                <p>
                  {new Date(latest.periodStart).toLocaleDateString()} –{" "}
                  {new Date(latest.periodEnd).toLocaleDateString()}
                </p>
                <p className="mt-2 text-xs">
                  Generated {new Date(latest.createdAt).toLocaleString()}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                Weekly progress
              </h2>
            </CardHeader>
            <CardBody className="text-sm text-fg-muted">
              {latest.payload.progressSummary}
              {latest.payload.monitorBriefSnippet && (
                <p className="mt-3 text-xs text-fg-subtle">
                  Monitor: {latest.payload.monitorBriefSnippet}
                </p>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">
                  Top priorities
                </h2>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm text-fg-muted">
                  {latest.payload.topPriorities.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span>{p.title}</span>
                      <SiteBadge item={p} />
                    </li>
                  ))}
                  {!latest.payload.topPriorities.length && (
                    <li>No priorities yet</li>
                  )}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">
                  Completed improvements
                </h2>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm text-fg-muted">
                  {latest.payload.completed.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span>{c.title}</span>
                      <SiteBadge item={c} />
                    </li>
                  ))}
                  {!latest.payload.completed.length && (
                    <li>None marked complete recently</li>
                  )}
                </ul>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                AI recommendations
              </h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {latest.payload.recommendations.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="accent">{r.moduleId ?? "gap"}</Badge>
                  <SiteBadge item={r} />
                  <span className="text-fg">{r.title}</span>
                </div>
              ))}
              {!latest.payload.recommendations.length && (
                <p className="text-sm text-fg-muted">No open recommendations</p>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {briefings.length > 1 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">History</h2>
          </CardHeader>
          <CardBody className="space-y-1 text-sm text-fg-muted">
            {briefings.slice(1).map((b) => (
              <p key={b.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {new Date(b.createdAt).toLocaleString()} · score{" "}
                  {b.payload.growthScore ?? "—"}
                </span>
                {b.payload.focusWebsite?.domain ? (
                  <Badge tone="accent">{b.payload.focusWebsite.domain}</Badge>
                ) : null}
              </p>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
