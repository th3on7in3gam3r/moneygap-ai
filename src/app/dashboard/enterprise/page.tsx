"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Overview = {
  organization: {
    id: string;
    name: string;
    type: string;
    plan: string;
    agencyName: string | null;
  };
  counts: {
    users: number;
    websites: number;
    reports: number;
    clients: number;
    analyses: number;
  };
  growth: {
    averageMoneyGapScore: number | null;
    recentScores: { websiteId: string; score: number; createdAt: string }[];
  };
  usage: Record<string, number>;
  enterprise: {
    ssoEnabled: boolean;
    ssoProvider: string | null;
    dataRetentionDays: number;
    dedicatedEnvironment: boolean;
    auditExportEnabled: boolean;
    note: string;
  };
};

export default function EnterprisePage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch("/api/enterprise/overview");
        if (res.ok) setData((await res.json()) as Overview);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Enterprise
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Organization overview, usage, and enterprise control scaffolds (SSO,
          retention, dedicated environments).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{data?.organization.plan ?? "…"}</Badge>
        <Badge tone="neutral">{data?.organization.type ?? "…"}</Badge>
        <span className="text-sm text-fg-muted">
          {data?.organization.agencyName || data?.organization.name || "…"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["Users", data?.counts.users],
            ["Websites", data?.counts.websites],
            ["Reports", data?.counts.reports],
            ["Clients", data?.counts.clients],
            ["Analyses", data?.counts.analyses],
          ] as const
        ).map(([label, value]) => (
          <Card key={label}>
            <CardBody>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                {label}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {value ?? "…"}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Growth scores</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-fg-muted">
              Average MoneyGap Score™:{" "}
              <span className="font-semibold text-fg">
                {data?.growth.averageMoneyGapScore ?? "—"}
              </span>
            </p>
            <ul className="space-y-2 text-sm">
              {(data?.growth.recentScores ?? []).map((s) => (
                <li
                  key={`${s.websiteId}-${s.createdAt}`}
                  className="flex justify-between border-b border-border py-1.5 last:border-0"
                >
                  <span className="truncate text-fg-muted">{s.websiteId.slice(0, 8)}…</span>
                  <span className="tabular-nums text-fg">{s.score}</span>
                </li>
              ))}
              {(data?.growth.recentScores.length ?? 0) === 0 && (
                <p className="text-fg-muted">No score snapshots yet.</p>
              )}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Usage</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            {Object.entries(data?.usage ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k.replace(/_/g, " ")}</span>
                <span className="tabular-nums text-fg">{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Enterprise controls</h2>
          <Badge tone="neutral">Scaffold</Badge>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>SSO enabled: {data?.enterprise.ssoEnabled ? "Yes" : "No (ready)"}</p>
          <p>Provider: {data?.enterprise.ssoProvider ?? "—"}</p>
          <p>Data retention: {data?.enterprise.dataRetentionDays ?? 365} days</p>
          <p>
            Dedicated environment:{" "}
            {data?.enterprise.dedicatedEnvironment ? "Yes" : "No (ready)"}
          </p>
          <p>Audit export: {data?.enterprise.auditExportEnabled ? "On" : "Off"}</p>
          <p className="text-xs">{data?.enterprise.note}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button href="/dashboard/developers" size="sm" variant="secondary">
              API & developers
            </Button>
            <Button href="/dashboard/billing" size="sm" variant="secondary">
              Billing
            </Button>
            <Button href="/dashboard/settings" size="sm" variant="ghost">
              ← Settings
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
