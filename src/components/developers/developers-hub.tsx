"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { ApiKeysPanel } from "@/components/developers/api-keys-panel";
import { LogsPanel } from "@/components/developers/logs-panel";
import { OverviewPanel } from "@/components/developers/overview-panel";
import { ResourcesPanel } from "@/components/developers/resources-panel";
import {
  type ApiScope,
  type DevelopersTab,
  type UsageSummary,
  type WebhookDeliveryRow,
  type WebhookRow,
} from "@/components/developers/types";
import { WebhooksPanel } from "@/components/developers/webhooks-panel";
import { MgLoader } from "@/components/mg-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS: { id: DevelopersTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "keys", label: "API Keys" },
  { id: "webhooks", label: "Webhooks" },
  { id: "logs", label: "Logs" },
  { id: "resources", label: "Resources" },
];

export function DevelopersHub() {
  const [tab, setTab] = useState<DevelopersTab>("overview");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRow[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  function reload() {
    void (async () => {
      const [uRes, wRes, dRes] = await Promise.all([
        fetch("/api/developer/usage"),
        fetch("/api/developer/webhooks"),
        fetch("/api/developer/webhooks/deliveries?limit=40"),
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
      if (dRes.ok) {
        const data = (await dRes.json()) as {
          deliveries: WebhookDeliveryRow[];
        };
        setDeliveries(data.deliveries ?? []);
      }
      setLoading(false);
    })();
  }

  useEffect(() => {
    const t = setTimeout(reload, 0);
    return () => clearTimeout(t);
  }, []);

  function copySecret() {
    if (!secret) return;
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function createKey(input: {
    name: string;
    environment: "development" | "production";
    scopes: ApiScope[];
  }) {
    startTransition(async () => {
      setMsg(null);
      setUpgrade(null);
      setSecret(null);
      setCopied(false);
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
      setTab("keys");
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
      setCopied(false);
      const res = await fetch(`/api/developer/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      });
      const data = (await res.json()) as {
        secret?: string;
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Rotate failed");
        return;
      }
      setSecret(data.secret ?? null);
      setMsg(data.note ?? "Key rotated");
      reload();
    });
  }

  function addWebhook(input: { url: string; events: string[] }) {
    startTransition(async () => {
      setMsg(null);
      setUpgrade(null);
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
      setMsg(
        data.endpoint?.secret
          ? `Webhook added. Signing secret: ${data.endpoint.secret}`
          : "Webhook added",
      );
      reload();
    });
  }

  function patchWebhook(
    id: string,
    body: { enabled?: boolean; events?: string[] },
  ) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch(`/api/developer/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMsg(data.error ?? "Update failed");
        return;
      }
      reload();
    });
  }

  function deleteWebhook(id: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch(`/api/developer/webhooks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMsg(data.error ?? "Delete failed");
        return;
      }
      setMsg("Webhook deleted");
      reload();
    });
  }

  function retryDelivery(id: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch(
        `/api/developer/webhooks/deliveries/${id}/retry`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMsg(data.error ?? "Retry failed");
        return;
      }
      setMsg("Delivery retried");
      reload();
    });
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Developers
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          MoneyGap API™ keys, webhooks, usage, and developer tools. API access is
          included on all plans (monthly quotas vary).
        </p>
      </div>

      {msg && <p className="break-all text-sm text-accent">{msg}</p>}
      {upgrade && <UpgradePrompt payload={upgrade} />}
      {secret && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
              New API secret — copy now
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={copySecret}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <code className="mt-2 block break-all text-sm text-fg">{secret}</code>
        </div>
      )}

      {!summary?.hasApiAccess && summary && (
        <UpgradePrompt
          payload={{
            code: "upgrade_required",
            message:
              "API access should be available on your plan. Soft-switch on Billing if entitlements look stale, or contact support.",
            suggestedPlan: "starter",
          }}
        />
      )}

      <div
        role="tablist"
        aria-label="Developer console sections"
        className="flex flex-wrap gap-1 border-b border-border pb-px"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <MgLoader label="Loading developer console…" size="sm" />
      ) : (
        <div role="tabpanel">
          {tab === "overview" && (
            <OverviewPanel
              summary={summary}
              onOpenTab={(next) => setTab(next)}
            />
          )}
          {tab === "keys" && (
            <ApiKeysPanel
              summary={summary}
              pending={pending}
              onCreate={createKey}
              onRotate={rotateKey}
              onRevoke={revokeKey}
            />
          )}
          {tab === "webhooks" && (
            <WebhooksPanel
              webhooks={webhooks}
              events={events}
              deliveries={deliveries}
              hasApiAccess={Boolean(summary?.hasApiAccess)}
              pending={pending}
              onAdd={addWebhook}
              onToggle={(id, enabled) => patchWebhook(id, { enabled })}
              onDelete={deleteWebhook}
              onUpdateEvents={(id, nextEvents) =>
                patchWebhook(id, { events: nextEvents })
              }
              onRetryDelivery={retryDelivery}
            />
          )}
          {tab === "logs" && <LogsPanel summary={summary} />}
          {tab === "resources" && <ResourcesPanel />}
        </div>
      )}
    </div>
  );
}
