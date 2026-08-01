"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OpportunityCollabPanel } from "@/components/team/opportunity-collab-panel";

type GrowthPayload = {
  enabled: boolean;
  message?: string;
  client: { id: string; name: string; websiteUrl: string | null };
  brand: {
    companyName: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    contactInfo: string | null;
    reportFooter: string | null;
    showPoweredBy: boolean;
  };
  reports: {
    id: string;
    title: string;
    moneyGapScore: number;
    revenueAtRisk: number;
  }[];
  opportunities: {
    id: string;
    reportId: string;
    title: string;
    category: string;
    whatsMissing: string;
    implementationStatus: string | null;
  }[];
  projects: {
    id: string;
    title: string;
    status: string;
    progress: number;
  }[];
};

export default function MyGrowthPage() {
  const [data, setData] = useState<GrowthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<{
    reportId: string;
    opportunityId: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => {
        void (async () => {
          try {
            const res = await fetch("/api/team/my-growth");
            const body = (await res.json()) as GrowthPayload & { error?: string };
            if (!res.ok) {
              setError(body.error ?? "Could not load");
              return;
            }
            setData(body);
            setError(null);
          } catch {
            setError("Could not load My Growth");
          }
        })();
      });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const brand = data?.brand;
  const accent = brand?.accentColor || brand?.primaryColor || undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header
        className="rounded-2xl border border-border px-6 py-8"
        style={
          accent
            ? {
                background: `linear-gradient(135deg, ${accent}14, transparent)`,
              }
            : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          {brand?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.companyName || "Brand"}
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              {brand?.companyName || "Growth workspace"}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {data?.client.name ?? "My Growth"}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Opportunities and projects shared with you.
            </p>
          </div>
        </div>
        {brand?.contactInfo && (
          <p className="mt-4 text-xs text-fg-muted">{brand.contactInfo}</p>
        )}
      </header>

      {pending && !data && (
        <p className="text-sm text-fg-muted">Loading…</p>
      )}
      {error && (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {data && !data.enabled && (
        <p className="text-sm text-fg-muted">{data.message}</p>
      )}

      {data?.enabled && (
        <>
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Reports</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {data.reports.length === 0 && (
                <p className="text-sm text-fg-muted">No reports linked yet.</p>
              )}
              {data.reports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{r.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">Score {r.moneyGapScore}</Badge>
                    <Button href={`/reports/${r.id}`} size="sm" variant="secondary">
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Opportunities</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.opportunities.length === 0 && (
                <p className="text-sm text-fg-muted">No open opportunities.</p>
              )}
              {data.opportunities.map((o) => (
                <div
                  key={o.id}
                  className="space-y-2 rounded-xl border border-border px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-fg">{o.title}</p>
                      <p className="mt-1 text-xs text-fg-muted">{o.whatsMissing}</p>
                    </div>
                    <Badge tone="neutral">
                      {o.implementationStatus ?? "open"}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setSelected({
                        reportId: o.reportId,
                        opportunityId: o.id,
                      })
                    }
                  >
                    Discuss / approve
                  </Button>
                  {selected?.opportunityId === o.id && (
                    <OpportunityCollabPanel
                      reportId={o.reportId}
                      opportunityId={o.id}
                    />
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Projects</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {data.projects.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{p.title}</span>
                  <span className="text-fg-muted">
                    {p.status} · {p.progress}%
                  </span>
                </div>
              ))}
              {data.projects.length === 0 && (
                <p className="text-sm text-fg-muted">No projects yet.</p>
              )}
            </CardBody>
          </Card>

          {(brand?.reportFooter || brand?.showPoweredBy) && (
            <p className="text-center text-xs text-fg-subtle">
              {brand.reportFooter}
              {brand.showPoweredBy && (
                <>
                  {brand.reportFooter ? " · " : null}
                  Powered by MoneyGap AI
                </>
              )}
            </p>
          )}
        </>
      )}

      <p className="text-xs text-fg-muted">
        <Link href="/dashboard" className="text-accent hover:underline">
          Overview
        </Link>
      </p>
    </div>
  );
}
