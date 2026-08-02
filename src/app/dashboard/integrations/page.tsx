"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

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
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    return oauthError ? `OAuth: ${oauthError}` : null;
  });
  const [category, setCategory] = useState<string>("all");
  const [apiKeyDraft, setApiKeyDraft] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function load() {
    void (async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) {
        setError("Could not load Integration Hub");
        return;
      }
      setData((await res.json()) as Overview);
      setError((prev) => (prev?.startsWith("OAuth:") ? prev : null));

      const auditRes = await fetch("/api/integrations/audit");
      if (auditRes.ok) {
        const body = (await auditRes.json()) as { audit: AuditRow[] };
        setAudit(body.audit ?? []);
      }
    })();
  }

  useEffect(() => {
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
      if (json.message) setError(json.message);
      load();
    });
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

      {error && <p className="text-sm text-gap">{error}</p>}

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
              return (
                <Card key={p.slug}>
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
                          onClick={() => connect(p.slug, p.authType)}
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
