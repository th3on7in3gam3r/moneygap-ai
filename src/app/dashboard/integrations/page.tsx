"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ConnectAckDialog,
  hasIntegrationsAck,
} from "@/components/integrations/connect-ack-dialog";
import { WhyConnectBand } from "@/components/integrations/why-connect-band";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  connectedSuccessMessage,
  providerUnlockLine,
} from "@/lib/integrations/unlock-copy";

type ProviderRow = {
  slug: string;
  name: string;
  category: string;
  authType: string;
  scopes: string[];
  status: string;
  description: string | null;
  connection: {
    id: string;
    status: string;
    lastSyncAt: string | null;
    lastError: string | null;
    healthScore: number | null;
    permissions: string[];
    snapshot: {
      warnings?: string[];
      metrics?: Record<string, number | string>;
    } | null;
  } | null;
};

type Overview = {
  providers: ProviderRow[];
  health: {
    score: number;
    connectedCount: number;
    staleCount: number;
    errorCount: number;
    missingCritical: string[];
    evaluatedAt: string;
  };
  connectionMap: {
    slug: string;
    name: string;
    category: string;
    status: string;
  }[];
  websites?: {
    id: string;
    name: string;
    domain: string;
    url: string;
  }[];
};

type AuditRow = {
  id: string;
  action: string;
  providerSlug: string | null;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

const CATEGORIES = [
  "all",
  "analytics",
  "crm",
  "email",
  "cms",
  "developer",
  "hosting",
  "payments",
  "automation",
] as const;

const GOOGLE_OAUTH_STUBS = new Set([
  "google_analytics",
  "google_search_console",
]);

function isBlogProperty(site: { name: string; domain: string }): boolean {
  const hay = `${site.name} ${site.domain}`.toLowerCase();
  return (
    hay.includes("signaldesk") ||
    hay.includes("signal desk") ||
    hay.includes("blog")
  );
}

function statusTone(
  status: string,
): "accent" | "neutral" | "danger" | "gap" | "success" {
  if (status === "connected") return "accent";
  if (status === "error") return "danger";
  if (status === "pending") return "gap";
  return "neutral";
}

export default function IntegrationsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [ackOpen, setAckOpen] = useState(false);
  const [pendingConnect, setPendingConnect] = useState<{
    slug: string;
    authType: string;
    name: string;
  } | null>(null);

  function load() {
    void (async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) {
        setError("Could not load Integration Hub");
        return;
      }
      const overview = (await res.json()) as Overview;
      setData(overview);
      setError((prev) => (prev?.startsWith("OAuth:") ? prev : null));

      const params = new URLSearchParams(window.location.search);
      const connectedSlug = params.get("connected")?.trim();
      if (connectedSlug) {
        const name =
          overview.providers.find((p) => p.slug === connectedSlug)?.name ??
          connectedSlug;
        setSuccess(connectedSuccessMessage(connectedSlug, name));
        params.delete("connected");
        const next = params.toString();
        const url = next
          ? `${window.location.pathname}?${next}`
          : window.location.pathname;
        window.history.replaceState({}, "", url);
      }

      const focus = params.get("focus")?.trim();
      if (focus) {
        setFocusSlug(focus);
        const provider = overview.providers.find((p) => p.slug === focus);
        if (provider) setCategory(provider.category);
        requestAnimationFrame(() => {
          document
            .getElementById(`integration-${focus}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }

      const auditRes = await fetch("/api/integrations/audit");
      if (auditRes.ok) {
        const body = (await auditRes.json()) as { audit: AuditRow[] };
        setAudit(body.audit ?? []);
      }
    })();
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      if (oauthError) {
        setError(`OAuth: ${oauthError}`);
        params.delete("error");
        const next = params.toString();
        const url = next
          ? `${window.location.pathname}?${next}`
          : window.location.pathname;
        window.history.replaceState({}, "", url);
      }
    }
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === "all") return data.providers;
    return data.providers.filter((p) => p.category === category);
  }, [data, category]);

  const mapByCategory = useMemo(() => {
    if (!data) return [] as { category: string; items: Overview["connectionMap"] }[];
    const groups = new Map<string, Overview["connectionMap"]>();
    for (const item of data.connectionMap) {
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    }
    return [...groups.entries()].map(([cat, items]) => ({
      category: cat,
      items,
    }));
  }, [data]);

  function connect(slug: string, authType: string) {
    startTransition(async () => {
      const body =
        authType === "api_key"
          ? { apiKey: apiKeyDraft[slug]?.trim() }
          : {};
      const res = await fetch(`/api/integrations/${slug}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        mode?: string;
        authUrl?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Connect failed");
        return;
      }
      if (json.mode === "oauth" && json.authUrl) {
        window.location.href = json.authUrl;
        return;
      }
      const name = data?.providers.find((p) => p.slug === slug)?.name ?? slug;
      setSuccess(connectedSuccessMessage(slug, name));
      setError(null);
      if (json.message) setError(json.message);
      load();
    });
  }

  function requestConnect(slug: string, authType: string, name: string) {
    if (!hasIntegrationsAck()) {
      setPendingConnect({ slug, authType, name });
      setAckOpen(true);
      return;
    }
    connect(slug, authType);
  }

  function disconnect(slug: string) {
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${slug}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Disconnect failed");
        return;
      }
      setSuccess(null);
      load();
    });
  }

  function sync(slug: string) {
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${slug}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Sync failed");
        return;
      }
      load();
    });
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <Button href="/dashboard/settings" size="sm" variant="ghost">
          ← Settings
        </Button>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Integration Hub
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Connect analytics, CRM, email, CMS, hosting, payments, and automation —
          encrypted credentials, soft-fail sync.
        </p>
      </div>

      <WhyConnectBand />

      {data?.websites && data.websites.filter(isBlogProperty).length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Your blog properties
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Sites like SignalDesk Blog are analyzed websites — open the
                workspace for scans, Money Gaps, and Growth Recipes. They are
                not a separate Hub OAuth connector.
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {data.websites.filter(isBlogProperty).map((site) => (
              <Button
                key={site.id}
                href={`/dashboard/websites/${site.id}`}
                size="sm"
                variant="secondary"
              >
                Open {site.name}
              </Button>
            ))}
            <Button href="/dashboard/websites" size="sm" variant="ghost">
              All websites
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">MoneyGap API keys</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Cadence → Settings → Integrations → Growth stack expects a MoneyGap
              API key. Create and copy one in Developer Hub.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <Button href="/dashboard/developers" size="sm">
            Open Developer Hub
          </Button>
        </CardBody>
      </Card>

      {success && (
        <p
          role="status"
          className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          {success}
        </p>
      )}
      {error && <p className="text-sm text-gap">{error}</p>}

      <ConnectAckDialog
        open={ackOpen}
        providerName={pendingConnect?.name ?? "this app"}
        onCancel={() => {
          setAckOpen(false);
          setPendingConnect(null);
        }}
        onConfirmed={() => {
          const next = pendingConnect;
          setAckOpen(false);
          setPendingConnect(null);
          if (next) connect(next.slug, next.authType);
        }}
      />

      {!data ? (
        <p className="text-sm text-fg-muted">Loading integrations…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Integration Health
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Connected systems, freshness, errors, and missing critical
                  categories.
                </p>
              </div>
              <Badge tone="accent">{data.health.score}/100</Badge>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-3 text-sm text-fg-muted">
              <Badge tone="neutral">
                connected {data.health.connectedCount}
              </Badge>
              <Badge tone="neutral">stale {data.health.staleCount}</Badge>
              <Badge tone={data.health.errorCount ? "danger" : "neutral"}>
                errors {data.health.errorCount}
              </Badge>
              {data.health.missingCritical.length > 0 && (
                <p className="w-full text-xs text-fg-subtle">
                  Missing critical: {data.health.missingCritical.join(", ")}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Business Connection Map
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Systems linked to this workspace by category.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {mapByCategory.map((group) => (
                <div key={group.category}>
                  <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                    {group.category}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Badge key={item.slug} tone={statusTone(item.status)}>
                        {item.name}: {item.status}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={category === c ? "primary" : "secondary"}
                onClick={() => setCategory(c)}
              >
                {c === "all" ? "All" : c}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((p) => {
              const conn = p.connection;
              const isLive =
                conn?.status === "connected" || conn?.status === "error";
              const focused = focusSlug === p.slug;
              const oauthStub = GOOGLE_OAUTH_STUBS.has(p.slug);
              return (
                <Card
                  key={p.slug}
                  id={`integration-${p.slug}`}
                  className={
                    focused
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-bg"
                      : undefined
                  }
                >
                  <CardHeader>
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        {p.name}
                      </h2>
                      <p className="mt-1 text-xs text-fg-subtle">{p.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone="neutral">{p.category}</Badge>
                      <Badge tone="neutral">{p.authType}</Badge>
                      <Badge tone={statusTone(conn?.status ?? "disconnected")}>
                        {conn?.status ?? "disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3 text-sm text-fg-muted">
                    {p.description && <p>{p.description}</p>}
                    <p className="text-xs leading-relaxed text-fg-subtle">
                      <span className="font-medium text-fg-muted">What this unlocks: </span>
                      {providerUnlockLine(p.slug)}
                    </p>
                    {oauthStub && (
                      <p className="rounded-lg border border-gap/30 bg-gap-soft/40 px-3 py-2 text-xs text-fg">
                        OAuth not configured yet — connection stays{" "}
                        <strong>Pending</strong> until Google OAuth is enabled.
                        Onboarding checklist items for Analytics / Search Console
                        complete only after status is Connected.
                      </p>
                    )}
                    {conn?.lastError && (
                      <p className="text-xs text-gap">{conn.lastError}</p>
                    )}
                    {conn?.lastSyncAt && (
                      <p className="text-xs text-fg-subtle">
                        Last sync {new Date(conn.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                    {p.authType === "api_key" && !isLive && (
                      <input
                        type="password"
                        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
                        placeholder={
                          p.slug === "hubspot"
                            ? "Private App access token (pat-…)"
                            : "API key"
                        }
                        value={apiKeyDraft[p.slug] ?? ""}
                        onChange={(e) =>
                          setApiKeyDraft((prev) => ({
                            ...prev,
                            [p.slug]: e.target.value,
                          }))
                        }
                      />
                    )}
                    {p.slug === "hubspot" && !isLive && (
                      <p className="text-xs text-fg-subtle">
                        Customers connect with HubSpot OAuth (one click). No developer
                        key required once Client ID/Secret are configured on the server.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!isLive ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => requestConnect(p.slug, p.authType, p.name)}
                        >
                          Connect
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => sync(p.slug)}
                          >
                            Sync
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => disconnect(p.slug)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                      {conn?.status === "pending" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => disconnect(p.slug)}
                        >
                          Clear pending
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {audit.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">Audit log</h2>
              </CardHeader>
              <CardBody className="space-y-2">
                {audit.slice(0, 20).map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-fg">{row.action}</p>
                      <p className="text-xs text-fg-subtle">
                        {row.providerSlug ?? "—"}
                      </p>
                    </div>
                    <p className="text-xs text-fg-subtle">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
