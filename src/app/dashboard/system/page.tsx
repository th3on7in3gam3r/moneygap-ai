"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type SystemStatus = {
  health: { ok: boolean; db: boolean };
  flags: {
    trustEngine: boolean;
    maintenanceMode: boolean;
    platform10?: boolean;
    marketplace?: boolean;
    teamWorkspace?: boolean;
    automation?: boolean;
    predictive?: boolean;
    copilot?: boolean;
  };
  readiness?: {
    stripeConfigured: boolean;
    cronSecretSet: boolean;
    encryptionKeySet: boolean;
    openaiSet: boolean;
  };
  analyses: {
    failedLast7Days: number;
    completedLast7Days: number;
    recentFailures: {
      id: string;
      url: string;
      error: string | null;
      completedAt: string | null;
      durationMs: number | null;
    }[];
  };
  metricsLast7Days: Record<string, number>;
};

export default function SystemPage() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<
    { id: string; action: string; entityType: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch("/api/system/status");
        if (!res.ok) {
          setError("Could not load system status");
          return;
        }
        setData((await res.json()) as SystemStatus);
        setError(null);

        const aRes = await fetch("/api/ops/audit?limit=12");
        if (aRes.ok) {
          const body = (await aRes.json()) as {
            entries?: { id: string; action: string; entityType: string; createdAt: string }[];
          };
          setAudit(body.entries ?? []);
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-fg-subtle">
          <Link href="/dashboard/settings" className="hover:text-accent">
            Settings
          </Link>
          {" / "}
          Operations
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Operations Dashboard™
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Health, feature flags, readiness probes, analysis failures, and audit peek.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href="/dashboard/launch" size="sm" variant="secondary">
            Launch Center
          </Button>
          <Button href="/dashboard/billing" size="sm" variant="secondary">
            Billing
          </Button>
        </div>
      </div>

      {!data && !error && (
        <p className="text-sm text-fg-muted" aria-live="polite">
          Loading status…
        </p>
      )}
      {error && (
        <p className="text-sm text-gap" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Health</h2>
            {data && (
              <Badge tone={data.health.ok ? "accent" : "gap"}>
                {data.health.ok ? "ok" : "degraded"}
              </Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            <p>
              API + DB:{" "}
              {data ? (data.health.db ? "reachable" : "unreachable") : "…"}
            </p>
            <p>
              Public check:{" "}
              <a
                href="/api/health"
                className="text-accent underline-offset-2 hover:underline"
              >
                /api/health
              </a>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Readiness</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {(
              [
                ["Stripe", data?.readiness?.stripeConfigured],
                ["CRON_SECRET", data?.readiness?.cronSecretSet],
                ["Encryption key", data?.readiness?.encryptionKeySet],
                ["OpenAI", data?.readiness?.openaiSet],
              ] as const
            ).map(([label, on]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-fg-muted">{label}</span>
                <Badge tone={on ? "accent" : "neutral"}>
                  {data ? (on ? "set" : "missing") : "…"}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Feature flags</h2>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2 text-sm">
          {(
            [
              ["Trust Engine™", data?.flags.trustEngine],
              ["Maintenance", data?.flags.maintenanceMode],
              ["Platform 1.0™", data?.flags.platform10],
              ["Marketplace™", data?.flags.marketplace],
              ["Team Workspace™", data?.flags.teamWorkspace],
              ["Automation™", data?.flags.automation],
              ["Predictive™", data?.flags.predictive],
              ["Copilot™", data?.flags.copilot],
            ] as const
          ).map(([label, on]) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-fg-muted">{label}</span>
              <Badge
                tone={
                  label === "Maintenance"
                    ? on
                      ? "gap"
                      : "neutral"
                    : on
                      ? "accent"
                      : "neutral"
                }
              >
                {data ? (on ? "on" : "off") : "…"}
              </Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Analyses (7 days)</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <p>
              <span className="text-fg-subtle">Completed</span>{" "}
              <span className="font-medium tabular-nums text-fg">
                {data?.analyses.completedLast7Days ?? "…"}
              </span>
            </p>
            <p>
              <span className="text-fg-subtle">Failed</span>{" "}
              <span className="font-medium tabular-nums text-fg">
                {data?.analyses.failedLast7Days ?? "…"}
              </span>
            </p>
          </div>
          {data && data.analyses.recentFailures.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.analyses.recentFailures.map((f) => (
                <li
                  key={f.id}
                  className="rounded-xl border border-border px-3 py-2 text-fg-muted"
                >
                  <p className="truncate font-medium text-fg">{f.url}</p>
                  <p className="mt-0.5 text-xs">{f.error ?? "Unknown error"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">No recent failures.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">
            Platform analytics (7 days)
          </h2>
        </CardHeader>
        <CardBody>
          {data && Object.keys(data.metricsLast7Days).length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {Object.entries(data.metricsLast7Days).map(([type, total]) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span className="text-fg-muted">{type.replace(/_/g, " ")}</span>
                  <span className="tabular-nums font-medium text-fg">{total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">No metric events yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Audit peek</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {audit.length === 0 && (
            <p className="text-sm text-fg-muted">
              No agency audit events (or insufficient permission).
            </p>
          )}
          {audit.map((e) => (
            <div
              key={e.id}
              className="flex justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{e.action}</span>
                <span className="text-fg-muted"> · {e.entityType}</span>
              </span>
              <span className="text-xs text-fg-subtle">
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
