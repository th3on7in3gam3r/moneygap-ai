"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { BriefPanel } from "@/components/opportunity-intelligence/brief-panel";
import { GrowthGraphView } from "@/components/opportunity-intelligence/growth-graph-view";
import { RecommendationCard } from "@/components/opportunity-intelligence/recommendation-card";
import { RoadmapList } from "@/components/opportunity-intelligence/roadmap-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Site = { id: string; name: string; domain: string; url: string };

type SummaryResponse = {
  hasAccess?: boolean;
  upgrade?: UpgradePayload | null;
  websites?: Site[];
  ok?: boolean;
  website?: Site;
  populated?: boolean;
  hasIntelligenceReport?: boolean;
  snapshot?: {
    recommendationCount: number;
    graphNodeCount: number;
    graphEdgeCount: number;
    avgOpportunityScore: number | null;
    executiveBlurb: string | null;
    keywordClusterCount: number;
    questionCount: number;
  } | null;
  moneyGapScore?: number | null;
  recommendations?: {
    id: string;
    kind: string;
    title: string;
    summary: string;
    whyItMatters: string;
    businessImpact: string;
    seoImpact: string;
    aiReadinessImpact: string;
    difficulty: string;
    estimatedTime: string;
    opportunityScore: number;
    nextSteps: string[] | null;
    implementationLinks: { label: string; href: string }[] | null;
    briefId: string | null;
    moneyGapOpportunityId: string | null;
  }[];
  roadmap?: {
    id: string;
    title: string;
    action: string;
    businessImpact: string;
    seoImpact: string;
    aiReadinessImpact: string;
    difficulty: string;
    estimatedTime: string;
    opportunityScore: number;
  }[];
  briefs?: { id: string; title: string; payload: Record<string, unknown> }[];
  graph?: {
    nodes: {
      id: string;
      nodeType: string;
      label: string;
      slug: string;
      meta?: Record<string, unknown> | null;
    }[];
    edges: {
      id: string;
      fromNodeId: string;
      toNodeId: string;
      edgeType: string;
      weight: number;
    }[];
  };
  error?: string;
};

export default function OpportunityIntelligencePage() {
  const [websiteId, setWebsiteId] = useState("");
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [kindFilter, setKindFilter] = useState("all");
  const [brief, setBrief] = useState<{
    title: string;
    payload: Record<string, unknown>;
  } | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function openBrief(briefId: string) {
    setBriefError(null);
    const cached = data?.briefs?.find((x) => x.id === briefId);
    if (cached) {
      setBrief({
        title: cached.title,
        payload: (cached.payload ?? {}) as Record<string, unknown>,
      });
      return;
    }

    setBriefLoading(true);
    try {
      const res = await fetch(
        `/api/opportunity-intelligence/briefs/${encodeURIComponent(briefId)}`,
      );
      const json = (await res.json()) as {
        ok?: boolean;
        brief?: {
          id: string;
          title: string;
          payload: Record<string, unknown>;
        };
        error?: string;
      };
      if (!res.ok || !json.brief) {
        setBriefError(json.error ?? "Could not load this content brief.");
        return;
      }
      setBrief({
        title: json.brief.title,
        payload: (json.brief.payload ?? {}) as Record<string, unknown>,
      });
    } catch {
      setBriefError("Could not load this content brief.");
    } finally {
      setBriefLoading(false);
    }
  }

  function load(id?: string) {
    startTransition(async () => {
      setError(null);
      const q = id ? `?websiteId=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/opportunity-intelligence${q}`);
      const json = (await res.json()) as SummaryResponse;
      if (!res.ok && res.status !== 403) {
        setError(json.error ?? "Could not load");
        return;
      }
      setData(json);
      if (!id && json.websites?.[0] && json.hasAccess) {
        setWebsiteId(json.websites[0].id);
      }
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (websiteId) load(websiteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]);

  const selected =
    data?.website ??
    data?.websites?.find((s) => s.id === websiteId) ??
    null;
  const siteLabel = selected?.name || selected?.domain || "this website";
  const analyzeHref = selected?.url
    ? `/dashboard/analyze?url=${encodeURIComponent(selected.url)}`
    : "/dashboard/analyze";
  const empty =
    Boolean(websiteId) &&
    Boolean(data?.hasAccess) &&
    !pending &&
    data?.populated === false;

  const recs = (data?.recommendations ?? []).filter(
    (r) => kindFilter === "all" || r.kind === kindFilter,
  );
  const kinds = [
    "all",
    ...new Set((data?.recommendations ?? []).map((r) => r.kind)),
  ];

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Opportunity Intelligence™
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Business growth opportunities powered by Growth Graph™ — topics,
          keywords, entities, questions, competitors, and revenue potential —
          not a keyword list.
        </p>
      </div>

      {data?.upgrade && !data.hasAccess && (
        <UpgradePrompt payload={data.upgrade} />
      )}
      {error && <p className="text-sm text-gap">{error}</p>}
      {briefError && <p className="text-sm text-gap">{briefError}</p>}
      {briefLoading && (
        <p className="text-xs text-fg-subtle">Loading content brief…</p>
      )}

      {brief && (
        <BriefPanel
          title={brief.title}
          payload={brief.payload}
          onClose={() => setBrief(null)}
        />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-fg-subtle">Website</span>
          <select
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={websiteId}
            onChange={(e) => setWebsiteId(e.target.value)}
            disabled={pending || !data?.websites?.length}
          >
            <option value="">Select website</option>
            {(data?.websites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.domain}
              </option>
            ))}
          </select>
        </label>
        {websiteId && data?.hasAccess && (
          <div className="flex flex-wrap gap-2">
            <Button
              href={`/api/opportunity-intelligence/export?websiteId=${websiteId}&format=json`}
              size="sm"
              variant="secondary"
            >
              Export JSON
            </Button>
            <Button
              href={`/api/opportunity-intelligence/export?websiteId=${websiteId}&format=md`}
              size="sm"
              variant="secondary"
            >
              Export Markdown
            </Button>
            <Button
              href={`/api/opportunity-intelligence/export?websiteId=${websiteId}&format=csv`}
              size="sm"
              variant="secondary"
            >
              Export CSV
            </Button>
          </div>
        )}
        {pending && websiteId ? (
          <p className="pb-2 text-xs text-fg-subtle">Loading {siteLabel}…</p>
        ) : null}
      </div>

      {empty ? (
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm text-fg">
              No Opportunity Intelligence™ for{" "}
              <span className="font-semibold">{siteLabel}</span> yet.
            </p>
            <p className="text-sm text-fg-muted">
              The dropdown switches which site you’re viewing. Growth Graph™,
              Content Roadmap™, and recommendations appear after a full website
              analysis finishes for that site.
              {data?.hasIntelligenceReport
                ? " An intelligence report exists, but the Opportunity Intelligence pass has not populated yet — re-run Analyze."
                : " Run Analyze on this URL to generate them."}
            </p>
            <Button href={analyzeHref} size="sm">
              Analyze {siteLabel}
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {data?.hasAccess && data.snapshot && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Recommendations",
              value: data.snapshot.recommendationCount,
            },
            {
              label: "Avg Opportunity Score™",
              value: data.snapshot.avgOpportunityScore ?? "—",
            },
            {
              label: "Graph nodes",
              value: data.snapshot.graphNodeCount,
            },
            {
              label: "MoneyGap Score™",
              value: data.moneyGapScore ?? "—",
            },
          ].map((m) => (
            <Card key={m.label}>
              <CardBody>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  {m.label}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                  {m.value}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {data?.snapshot?.executiveBlurb && (
        <p className="rounded-xl border border-accent/20 bg-accent-soft/40 px-4 py-3 text-sm text-fg">
          {data.snapshot.executiveBlurb}
        </p>
      )}

      {data?.hasAccess && !empty && (
        <>
          <Card>
            <CardHeader>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Growth Graph™
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Interactive map of pages, topics, keywords, entities,
                  questions, competitors, and revenue opportunities.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <GrowthGraphView
                nodes={data.graph?.nodes ?? []}
                edges={data.graph?.edges ?? []}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Content Roadmap™
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Prioritized by Opportunity Score™ with business, SEO, and AI
                  impact.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <RoadmapList items={data.roadmap ?? []} />
            </CardBody>
          </Card>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">
                Recommendations
              </h2>
              <div className="flex flex-wrap gap-1">
                {kinds.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={kindFilter === k ? "primary" : "secondary"}
                    onClick={() => setKindFilter(k)}
                  >
                    {k === "all" ? "All" : k.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </div>
            {recs.length === 0 ? (
              <p className="text-sm text-fg-muted">
                No recommendations yet. Run a website analysis to populate
                Opportunity Intelligence™.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {recs.map((r) => (
                  <RecommendationCard
                    key={r.id}
                    rec={r}
                    onOpenBrief={(briefId) => {
                      void openBrief(briefId);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {data.snapshot && (
            <p className="text-xs text-fg-subtle">
              Clusters {data.snapshot.keywordClusterCount} · Questions{" "}
              {data.snapshot.questionCount} · Edges{" "}
              {data.snapshot.graphEdgeCount}
              <Badge tone="neutral" className="ml-2">
                Phase 1
              </Badge>
            </p>
          )}
        </>
      )}

      {!data?.hasAccess && data && !data.upgrade && (
        <p className="text-sm text-fg-muted">Loading…</p>
      )}
    </div>
  );
}
