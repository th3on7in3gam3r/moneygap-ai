"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SmartConsent } from "@/components/privacy/smart-consent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { CookieInventoryRow } from "@/lib/privacy/cookie-catalog";

type CenterPayload = {
  workspaceName: string | null;
  consentSchemaVersion: string;
  privacyPolicyVersion: string;
  consent: {
    categories: Record<string, boolean>;
    policyVersion: string;
    consentVersion: string;
    source: string;
    updatedAt: string;
  } | null;
  events: {
    id: string;
    eventType: string;
    categoriesEnabled: string[];
    categoriesDisabled: string[];
    policyVersion: string;
    consentVersion: string;
    source: string;
    createdAt: string;
  }[];
  integrations: { provider: string; status: string }[];
  storedDataSummary: Record<string, number>;
  processors: { name: string; purpose: string; active: boolean }[];
};

const FAQ = [
  {
    q: "What is Essential data?",
    a: "Authentication, security, and consent preference storage required to run MoneyGap. Essential cannot be disabled.",
  },
  {
    q: "Do you run analytics cookies today?",
    a: "No third-party analytics scripts are loaded today. The Analytics category is ready for future gates and will stay off until you enable it and we ship a real script.",
  },
  {
    q: "Can I delete my data?",
    a: "Download My Data exports an operational snapshot. Account deletion is handled through your Clerk account profile; contact support@moneygap-ai.com for workspace cleanup assistance.",
  },
  {
    q: "Is MoneyGap GDPR certified?",
    a: "We design for transparency and configurable consent. We do not claim legal certification — review policies with counsel for your organization.",
  },
];

export default function PrivacyCenterPage() {
  const [data, setData] = useState<CenterPayload | null>(null);
  const [inventory, setInventory] = useState<CookieInventoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const clientNames =
        typeof document !== "undefined"
          ? document.cookie
              .split(";")
              .map((p) => p.trim().split("=")[0])
              .filter(Boolean)
          : [];
      const storageKeys: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) storageKeys.push(k);
        }
      } catch {
        /* ignore */
      }

      const qs = new URLSearchParams();
      if (clientNames.length) qs.set("client", clientNames.join(","));
      if (storageKeys.length) qs.set("storage", storageKeys.join(","));

      const [centerRes, cookieRes] = await Promise.all([
        fetch("/api/privacy/center"),
        fetch(`/api/privacy/cookies?${qs.toString()}`),
      ]);
      if (!centerRes.ok) {
        setError("Could not load Privacy Center™.");
        return;
      }
      setData((await centerRes.json()) as CenterPayload);
      if (cookieRes.ok) {
        const c = (await cookieRes.json()) as { inventory: CookieInventoryRow[] };
        setInventory(c.inventory ?? []);
      }
    } catch {
      setError("Network error loading Privacy Center™.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return inventory.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.purpose.toLowerCase().includes(q) ||
        row.provider.toLowerCase().includes(q)
      );
    });
  }, [inventory, query, categoryFilter]);

  async function downloadExport() {
    const res = await fetch("/api/privacy/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneygap-privacy-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Settings
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Privacy Center™
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">
          Understand what MoneyGap collects, why it helps your experience, and control
          optional categories anytime.
        </p>
        <p className="mt-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg-subtle">
          Not legal advice. Organizations should review privacy policies with counsel before
          production claims. Policy version{" "}
          {data?.privacyPolicyVersion ?? "…"} · Consent schema{" "}
          {data?.consentSchemaVersion ?? "…"}
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Cookie Preferences</h2>
            <Button size="sm" variant="secondary" onClick={() => setPrefsOpen((v) => !v)}>
              {prefsOpen ? "Hide" : "Update"}
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {data?.consent ? (
              <p className="text-sm text-fg-muted">
                Last updated{" "}
                {new Date(data.consent.updatedAt).toLocaleString()} via {data.consent.source}.
              </p>
            ) : (
              <p className="text-sm text-fg-muted">No account consent record yet.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPrefsOpen(true)}>
                Customize
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("mg:open-smart-consent"))
                }
              >
                Open Smart Consent™
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void downloadExport()}>
                Export preferences
              </Button>
            </div>
            {prefsOpen ? (
              <div className="pt-2">
                <SmartConsent
                  embedded
                  forceOpen
                  onClose={() => {
                    setPrefsOpen(false);
                    void load();
                  }}
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Stored Data Summary</h2>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(data?.storedDataSummary ?? {}).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                    {k}
                  </dt>
                  <dd className="font-display text-xl font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
              {Object.keys(data?.storedDataSummary ?? {}).length === 0 ? (
                <p className="col-span-2 text-sm text-fg-muted">No workspace tallies yet.</p>
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Cookie Intelligence™</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, purpose, provider…"
              className="min-w-[200px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            >
              <option value="all">All categories</option>
              <option value="essential">Essential</option>
              <option value="performance">Performance</option>
              <option value="analytics">Analytics</option>
              <option value="personalization">Personalization</option>
              <option value="productImprovement">Product Improvement</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Purpose</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Expiration</th>
                  <th className="py-2 pr-3">Flags</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={`${row.kind}-${row.name}`} className="border-t border-border">
                    <td className="py-2 pr-3 font-mono text-xs">{row.name}</td>
                    <td className="py-2 pr-3 text-fg-muted">{row.purpose}</td>
                    <td className="py-2 pr-3 capitalize">{row.category}</td>
                    <td className="py-2 pr-3 text-fg-muted">{row.expiration}</td>
                    <td className="py-2 pr-3 text-[11px] text-fg-subtle">
                      {row.kind === "localStorage"
                        ? "localStorage"
                        : [
                            row.secure ? "Secure" : null,
                            row.httpOnly ? "HttpOnly" : null,
                            row.sameSite ? `SameSite=${row.sameSite}` : null,
                            row.encrypted ? "Encrypted" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                    </td>
                    <td className="py-2 pr-3">{row.provider}</td>
                    <td className="py-2">
                      <Badge
                        tone={
                          row.status === "active"
                            ? "accent"
                            : row.status === "not_currently_loaded"
                              ? "neutral"
                              : "gap"
                        }
                      >
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Consent Timeline™</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {(data?.events ?? []).length === 0 ? (
              <p className="text-sm text-fg-muted">No consent events recorded yet.</p>
            ) : (
              (data?.events ?? []).map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium text-fg">
                    {e.eventType.replace(/_/g, " ")} · {e.source}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {new Date(e.createdAt).toLocaleString()} · policy {e.policyVersion} ·
                    schema {e.consentVersion}
                  </p>
                  {(e.categoriesEnabled.length > 0 || e.categoriesDisabled.length > 0) && (
                    <p className="mt-1 text-xs text-fg-subtle">
                      {e.categoriesEnabled.length
                        ? `Enabled: ${e.categoriesEnabled.join(", ")}`
                        : null}
                      {e.categoriesEnabled.length && e.categoriesDisabled.length
                        ? " · "
                        : null}
                      {e.categoriesDisabled.length
                        ? `Disabled: ${e.categoriesDisabled.join(", ")}`
                        : null}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Connected Integrations</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {(data?.integrations ?? []).length === 0 ? (
              <p className="text-sm text-fg-muted">
                No integrations connected.{" "}
                <Link href="/dashboard/integrations" className="text-accent hover:underline">
                  Manage integrations
                </Link>
              </p>
            ) : (
              data?.integrations.map((i) => (
                <div
                  key={i.provider}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{i.provider}</span>
                  <Badge tone="neutral">{i.status}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Data Processing Summary</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {(data?.processors ?? []).map((p) => (
              <div
                key={p.name}
                className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-fg-muted">{p.purpose}</p>
                </div>
                <Badge tone={p.active ? "accent" : "neutral"}>
                  {p.active ? "Configured" : "Not configured"}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Third-party Services</h2>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-fg-muted">
            <p>
              Processors above are the verified services MoneyGap may use based on
              environment configuration. We do not invent inactive trackers.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button href="/security" size="sm" variant="secondary">
                Security Information
              </Button>
              <Button href="/privacy" size="sm" variant="secondary">
                Privacy Policy
              </Button>
              <Button href="/dashboard/settings" size="sm" variant="ghost">
                Back to Settings
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Download My Data</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => void downloadExport()}>
            Download JSON export
          </Button>
          <p className="text-sm text-fg-muted">
            Includes consent history, processors, and workspace tallies — not a full raw DB dump.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Delete My Account</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p>
            Account deletion is managed through Clerk. Open your account security profile,
            then contact{" "}
            <a className="text-accent hover:underline" href="mailto:support@moneygap-ai.com">
              support@moneygap-ai.com
            </a>{" "}
            if you need workspace data removal assistance. We do not silently wipe workspaces.
          </p>
          <Button href="/dashboard/settings" size="sm" variant="secondary">
            Open Account settings
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Privacy FAQ</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-border px-3 py-2">
              <p className="text-sm font-medium text-fg">{item.q}</p>
              <p className="mt-1 text-sm text-fg-muted">{item.a}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
