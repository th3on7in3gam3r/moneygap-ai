"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type UsageSummary = {
  planId: string;
  planName: string;
  hasApiAccess: boolean;
  limits: { apiCallsPerMonth: number; analysesPerMonth: number };
  usage: {
    api_call: number;
    website_analysis: number;
    requestsThisMonth: number;
    errorsThisMonth: number;
  };
  keys: {
    id: string;
    name: string;
    keyPrefix: string;
    environment: string;
    scopes: string[];
    rateLimitPerMinute: number;
    lastUsedAt: string | null;
  }[];
  recentRequests: {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    errorCode: string | null;
    createdAt: string;
  }[];
};

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
};

export default function DevelopersPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("Default key");
  const [keyEnv, setKeyEnv] = useState<"development" | "production">("development");
  const [hookUrl, setHookUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradePayload | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    void (async () => {
      const [uRes, wRes] = await Promise.all([
        fetch("/api/developer/usage"),
        fetch("/api/developer/webhooks"),
      ]);
      if (uRes.ok) setSummary((await uRes.json()) as UsageSummary);
      if (wRes.ok) {
        const data = (await wRes.json()) as {
          endpoints: WebhookRow[];
          events: string[];
        };
        setWebhooks(data.endpoints ?? []);
        setEvents(data.events ?? []);
      }
    })();
  }

  useEffect(() => {
    const t = setTimeout(reload, 0);
    return () => clearTimeout(t);
  }, []);

  function createKey() {
    startTransition(async () => {
      setMsg(null);
      setUpgrade(null);
      setSecret(null);
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, environment: keyEnv }),
      });
      const data = (await res.json()) as UpgradePayload & {
        secret?: string;
        error?: string;
        note?: string;
      };
      if (!res.ok) {
        if (res.status === 403) setUpgrade(data);
        else setMsg(data.error ?? "Could not create key");
        return;
      }
      setSecret(data.secret ?? null);
      setMsg(data.note ?? "Key created");
      reload();
    });
  }

  function revokeKey(id: string) {
    startTransition(async () => {
      await fetch(`/api/developer/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      reload();
    });
  }

  function rotateKey(id: string) {
    startTransition(async () => {
      setSecret(null);
      const res = await fetch(`/api/developer/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      });
      const data = (await res.json()) as { secret?: string; note?: string; error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Rotate failed");
        return;
      }
      setSecret(data.secret ?? null);
      setMsg(data.note ?? "Key rotated");
      reload();
    });
  }

  function addWebhook() {
    startTransition(async () => {
      setMsg(null);
      setUpgrade(null);
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: hookUrl,
          events: events.length ? events : ["analysis.completed"],
        }),
      });
      const data = (await res.json()) as UpgradePayload & {
        error?: string;
        endpoint?: { secret: string };
      };
      if (!res.ok) {
        if (res.status === 403) setUpgrade(data);
        else setMsg(data.error ?? "Could not add webhook");
        return;
      }
      setHookUrl("");
      setMsg(
        data.endpoint?.secret
          ? `Webhook added. Signing secret: ${data.endpoint.secret}`
          : "Webhook added",
      );
      reload();
    });
  }

  const apiLimit = summary?.limits.apiCallsPerMonth ?? 0;
  const apiUsed = summary?.usage.api_call ?? 0;

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Developers
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          MoneyGap API™ keys, usage, webhooks, and docs. Requires{" "}
          <span className="text-fg">api_access</span> (Professional+).
        </p>
      </div>

      {msg && <p className="text-sm text-accent break-all">{msg}</p>}
      {upgrade && <UpgradePrompt payload={upgrade} />}
      {secret && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
            New API secret — copy now
          </p>
          <code className="mt-2 block break-all text-sm text-fg">{secret}</code>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Requests this month",
            value: summary?.usage.requestsThisMonth ?? "…",
          },
          {
            label: "API calls (metered)",
            value: `${apiUsed} / ${apiLimit >= 999_999 ? "∞" : apiLimit}`,
          },
          { label: "Errors", value: summary?.usage.errorsThisMonth ?? "…" },
          {
            label: "Plan",
            value: summary?.planName ?? "…",
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

      {!summary?.hasApiAccess && (
        <UpgradePrompt
          payload={{
            code: "upgrade_required",
            message:
              "API access unlocks on Professional, Agency, and Enterprise. Soft-switch on Billing until Stripe Checkout is configured.",
            suggestedPlan: "professional",
          }}
        />
      )}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">API keys</h2>
          <Badge tone={summary?.hasApiAccess ? "accent" : "neutral"}>
            {summary?.hasApiAccess ? "Enabled" : "Locked"}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name"
            />
            <select
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              value={keyEnv}
              onChange={(e) =>
                setKeyEnv(e.target.value as "development" | "production")
              }
            >
              <option value="development">Development (mg_test_)</option>
              <option value="production">Production (mg_live_)</option>
            </select>
            <Button
              type="button"
              size="sm"
              disabled={pending || !summary?.hasApiAccess}
              onClick={createKey}
            >
              Generate key
            </Button>
          </div>
          <ul className="space-y-2">
            {(summary?.keys ?? []).map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-fg">{k.name}</p>
                  <p className="text-xs text-fg-muted">
                    {k.keyPrefix}… · {k.environment} · {k.rateLimitPerMinute}/min
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => rotateKey(k.id)}
                  >
                    Rotate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => revokeKey(k.id)}
                    className="text-danger"
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
            {(summary?.keys.length ?? 0) === 0 && (
              <p className="text-sm text-fg-muted">No active keys yet.</p>
            )}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Webhooks</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[240px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              value={hookUrl}
              onChange={(e) => setHookUrl(e.target.value)}
              placeholder="https://example.com/webhooks/moneygap"
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || !hookUrl || !summary?.hasApiAccess}
              onClick={addWebhook}
            >
              Add endpoint
            </Button>
          </div>
          <p className="text-xs text-fg-muted">
            Events: {(events.length ? events : ["analysis.completed"]).join(", ")}
          </p>
          <ul className="space-y-2">
            {webhooks.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              >
                <p className="truncate font-medium">{w.url}</p>
                <p className="text-xs text-fg-muted">
                  {w.enabled ? "Enabled" : "Disabled"} · {w.events.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Recent requests</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(summary?.recentRequests ?? []).slice(0, 15).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-xs last:border-0"
            >
              <span className="font-mono text-fg">
                {r.method} {r.path}
              </span>
              <span className="text-fg-muted">
                {r.statusCode}
                {r.errorCode ? ` · ${r.errorCode}` : ""} ·{" "}
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {(summary?.recentRequests.length ?? 0) === 0 && (
            <p className="text-sm text-fg-muted">No API requests logged yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Documentation</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            Base URL: <code className="text-fg">/api/v1</code>
          </p>
          <p>
            Auth: <code className="text-fg">Authorization: Bearer mg_test_…</code> or{" "}
            <code className="text-fg">X-API-Key</code>
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code>POST /api/v1/analyze</code> — queue analysis
            </li>
            <li>
              <code>GET /api/v1/analyze/&#123;id&#125;/status</code>
            </li>
            <li>
              <code>GET /api/v1/websites/&#123;id&#125;/score</code>
            </li>
            <li>
              <code>GET /api/v1/websites/&#123;id&#125;/opportunities</code>
            </li>
            <li>
              <code>GET /api/v1/reports/&#123;id&#125;</code>
            </li>
          </ul>
          <p>
            Full reference lives in the repo at{" "}
            <code className="text-fg">docs/api-platform.md</code>.
          </p>
          <Button href="/dashboard/settings" variant="ghost" size="sm">
            ← Settings
          </Button>
          <Button href="/dashboard/integrations" variant="ghost" size="sm">
            Integration Hub
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
