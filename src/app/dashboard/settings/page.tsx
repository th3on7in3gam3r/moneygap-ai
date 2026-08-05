"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AccountProfile } from "@/components/dashboard/account-profile";
import { PulseCadenceSettings } from "@/components/dashboard/pulse-cadence-settings";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  FlashToast,
  makeFlashToast,
  type FlashToastState,
} from "@/components/ui/flash-toast";
import { getPlanLimits } from "@/lib/agency/plans";

type WorkspacePayload = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    type: string;
    plan: string;
    agencyName: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
  };
  role: string;
  isAgency: boolean;
  planLimits: ReturnType<typeof getPlanLimits>;
};

type Member = {
  id: string;
  role: string;
  userId: string;
  user: { email: string; firstName: string | null; lastName: string | null } | null;
};

type Template = { id: string; slug: string; name: string; priorityNotes: string | null };

export default function SettingsPage() {
  const [ws, setWs] = useState<WorkspacePayload | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [brand, setBrand] = useState({
    companyName: "",
    logoUrl: "",
    contactInfo: "",
    reportFooter: "",
    showPoweredBy: true,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [upgrade, setUpgrade] = useState<UpgradePayload | null>(null);
  const [toast, setToast] = useState<FlashToastState>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const [wRes, tRes, bRes, mRes] = await Promise.all([
          fetch("/api/workspace"),
          fetch("/api/agency/templates"),
          fetch("/api/agency/brand"),
          fetch("/api/agency/team"),
        ]);
        if (wRes.ok) setWs((await wRes.json()) as WorkspacePayload);
        if (tRes.ok) {
          const data = (await tRes.json()) as { templates: Template[] };
          setTemplates(data.templates ?? []);
        }
        if (bRes.ok) {
          const data = (await bRes.json()) as {
            brand?: {
              companyName: string | null;
              logoUrl: string | null;
              contactInfo: string | null;
              reportFooter: string | null;
              showPoweredBy: boolean;
            } | null;
          };
          if (data.brand) {
            setBrand({
              companyName: data.brand.companyName ?? "",
              logoUrl: data.brand.logoUrl ?? "",
              contactInfo: data.brand.contactInfo ?? "",
              reportFooter: data.brand.reportFooter ?? "",
              showPoweredBy: data.brand.showPoweredBy,
            });
          }
        }
        if (mRes.ok) {
          const data = (await mRes.json()) as { members: Member[] };
          setMembers(data.members ?? []);
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function patchWorkspace(body: Record<string, unknown>) {
    startTransition(async () => {
      setBusyKey("workspace");
      try {
        const res = await fetch("/api/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          workspace?: WorkspacePayload["workspace"];
          error?: string;
        };
        if (!res.ok) {
          setToast(makeFlashToast(data.error ?? "Could not update workspace", "error"));
          return;
        }
        if (data.workspace && ws) {
          setWs({
            ...ws,
            workspace: data.workspace,
            isAgency:
              data.workspace.type === "agency" ||
              data.workspace.type === "enterprise",
            planLimits: getPlanLimits(data.workspace.plan),
          });
        }
        setToast(
          makeFlashToast("Workspace updated", "success"),
        );
      } finally {
        setBusyKey(null);
      }
    });
  }

  function saveBrand() {
    startTransition(async () => {
      setBusyKey("brand");
      setUpgrade(null);
      try {
        const res = await fetch("/api/agency/brand", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(brand),
        });
        const data = (await res.json()) as UpgradePayload & {
          error?: string;
          warning?: string;
          brand?: {
            companyName: string | null;
            logoUrl: string | null;
            contactInfo: string | null;
            reportFooter: string | null;
            showPoweredBy: boolean;
          };
        };
        if (!res.ok) {
          if (res.status === 403 || data.code === "upgrade_required") {
            setUpgrade(data);
            setToast(
              makeFlashToast(
                data.error ?? data.message ?? "Upgrade required to save brand",
                "error",
                { href: "/dashboard/billing", hrefLabel: "View billing →" },
              ),
            );
          } else {
            setToast(makeFlashToast(data.error ?? "Could not save brand", "error"));
          }
          return;
        }
        if (data.brand) {
          setBrand({
            companyName: data.brand.companyName ?? "",
            logoUrl: data.brand.logoUrl ?? "",
            contactInfo: data.brand.contactInfo ?? "",
            reportFooter: data.brand.reportFooter ?? "",
            showPoweredBy: data.brand.showPoweredBy,
          });
        }
        if (data.warning || data.code === "upgrade_required") {
          setUpgrade(data);
          setToast(
            makeFlashToast(
              data.warning ??
                "Brand saved. Upgrade to Agency to hide MoneyGap branding.",
              "info",
              { href: "/dashboard/billing", hrefLabel: "View Agency plans →" },
            ),
          );
          return;
        }
        setToast(makeFlashToast("Brand settings saved", "success"));
      } finally {
        setBusyKey(null);
      }
    });
  }

  function invite() {
    startTransition(async () => {
      setBusyKey("invite");
      setUpgrade(null);
      try {
        const res = await fetch("/api/agency/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: "analyst" }),
        });
        const data = (await res.json()) as UpgradePayload & { error?: string };
        if (!res.ok) {
          if (
            res.status === 403 ||
            data.code === "upgrade_required" ||
            data.code === "usage_limit"
          ) {
            setUpgrade(data);
            setToast(
              makeFlashToast(
                data.error ?? data.message ?? "Invite blocked by plan limits",
                "error",
                { href: "/dashboard/billing", hrefLabel: "View billing →" },
              ),
            );
          } else {
            setToast(makeFlashToast(data.error ?? "Invite failed", "error"));
          }
          return;
        }
        setInviteEmail("");
        setToast(makeFlashToast("Team member added", "success"));
        const mRes = await fetch("/api/agency/team");
        if (mRes.ok) {
          const mData = (await mRes.json()) as { members: Member[] };
          setMembers(mData.members ?? []);
        }
      } finally {
        setBusyKey(null);
      }
    });
  }

  const limits = ws?.planLimits ?? getPlanLimits("free");

  return (
    <div className="w-full space-y-8">
      <FlashToast toast={toast} onDismiss={dismissToast} />
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Workspace type, team, brand, plan limits, and account security.
        </p>
      </div>

      {upgrade && <UpgradePrompt payload={upgrade} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Workspace</h2>
            {ws && <Badge tone="accent">{ws.workspace.plan.replace(/_/g, " ")}</Badge>}
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">Name</p>
              <p className="mt-1 font-medium">{ws?.workspace.name ?? "…"}</p>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.08em] text-fg-subtle">Type</p>
              <div className="flex flex-wrap gap-2">
                {(["individual", "agency", "enterprise"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={pending}
                    onClick={() => patchWorkspace({ type: t })}
                    className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
                      ws?.workspace.type === t
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-fg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                placeholder="Agency display name"
                defaultValue={ws?.workspace.agencyName ?? ""}
                onBlur={(e) =>
                  patchWorkspace({ agencyName: e.target.value || null })
                }
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                placeholder="Agency website"
                defaultValue={ws?.workspace.websiteUrl ?? ""}
                onBlur={(e) =>
                  patchWorkspace({ websiteUrl: e.target.value || null })
                }
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                placeholder="Contact email"
                defaultValue={ws?.workspace.contactEmail ?? ""}
                onBlur={(e) =>
                  patchWorkspace({ contactEmail: e.target.value || null })
                }
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Plan & billing</h2>
            <Badge tone="accent">{ws?.workspace.plan.replace(/_/g, " ") ?? "…"}</Badge>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-fg-muted">
            <p>Clients: up to {limits.maxClients}</p>
            <p>Team seats: up to {limits.maxSeats}</p>
            <p>Reports / month: {limits.reportsPerMonth}</p>
            <p>White-label: {limits.whiteLabel ? "Yes" : "No"}</p>
            <p className="pt-1 text-xs text-fg-subtle">
              Usage meters, plan comparison, and soft plan switching live on Billing.
              Stripe Checkout enables when billing keys are configured.
            </p>
            <Button href="/dashboard/billing" size="sm">
              Open billing
            </Button>
            <div className="space-y-2 pt-2">
              <p className="text-xs text-fg-subtle">
                Create keys for Cadence and other integrations.
              </p>
              <Button href="/dashboard/developers" size="sm">
                Developers / API
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button href="/dashboard/integrations" size="sm" variant="secondary">
                Integration Hub
              </Button>
              <Button href="/dashboard/developer-mode" size="sm" variant="secondary">
                Developer Mode
              </Button>
              <Button href="/dashboard/confidence" size="sm" variant="secondary">
                Confidence Center
              </Button>
              <Button href="/dashboard/self-optimization" size="sm" variant="secondary">
                Self Optimization
              </Button>
              <Button href="/dashboard/automation" size="sm" variant="secondary">
                Automation Studio
              </Button>
              <Button href="/dashboard/executive" size="sm" variant="secondary">
                Executive Briefing
              </Button>
              <Button href="/dashboard/enterprise" size="sm" variant="secondary">
                Enterprise overview
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Team</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Member email (must already have an account)"
              className="min-w-[240px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || busyKey !== null || !inviteEmail}
              onClick={invite}
            >
              {busyKey === "invite" ? "Adding…" : "Add member"}
            </Button>
          </div>
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span>
                  {m.user?.email ?? m.userId}
                  {(m.user?.firstName || m.user?.lastName) && (
                    <span className="text-fg-muted">
                      {" "}
                      · {[m.user.firstName, m.user.lastName].filter(Boolean).join(" ")}
                    </span>
                  )}
                </span>
                <Badge tone="neutral">{m.role.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Brand settings</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Shown on shared reports and client-facing exports.
            </p>
          </div>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="size-10 rounded-lg border border-border bg-bg object-contain p-1"
            />
          ) : null}
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-fg-muted">
            Company name
            <input
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              placeholder="e.g. CitePilot"
              value={brand.companyName}
              onChange={(e) => setBrand({ ...brand, companyName: e.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-fg-muted">
            Logo URL
            <input
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              placeholder="https://yoursite.com/logo.svg"
              value={brand.logoUrl}
              onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-fg-muted sm:col-span-2">
            Contact info
            <input
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              placeholder="hello@yourbrand.com · yourbrand.com"
              value={brand.contactInfo}
              onChange={(e) => setBrand({ ...brand, contactInfo: e.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-fg-muted sm:col-span-2">
            Report footer
            <textarea
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              rows={3}
              placeholder="Prepared by your agency. Confidential."
              value={brand.reportFooter}
              onChange={(e) => setBrand({ ...brand, reportFooter: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={brand.showPoweredBy}
              onChange={(e) =>
                setBrand({ ...brand, showPoweredBy: e.target.checked })
              }
            />
            Show “Powered by MoneyGap AI”
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending || busyKey !== null}
              onClick={() =>
                setBrand({
                  companyName: "CitePilot",
                  logoUrl: "https://getcitepilot.com/logo-mark.svg",
                  contactInfo: "jerlessm@gmail.com · getcitepilot.com",
                  reportFooter:
                    "Prepared for your growth team by CitePilot. Confidential — do not redistribute without permission.",
                  showPoweredBy: true,
                })
              }
            >
              Fill sample
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || busyKey !== null}
              onClick={saveBrand}
            >
              {busyKey === "brand" ? "Saving…" : "Save brand"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Intelligent Onboarding™</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Replay setup, view the checklist, or reset progress (keeps reports).
            </p>
          </div>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          <Button href="/dashboard/onboarding" size="sm">
            Open onboarding
          </Button>
          <Button href="/dashboard/success" size="sm" variant="secondary">
            View checklist
          </Button>
          <Button href="/dashboard/onboarding/demo" size="sm" variant="secondary">
            Demo workspace
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || busyKey !== null}
            onClick={() => {
              startTransition(async () => {
                setBusyKey("onboarding");
                try {
                  await fetch("/api/onboarding", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "replay" }),
                  });
                  setToast(makeFlashToast("Onboarding ready to replay", "success"));
                  window.location.href = "/dashboard/onboarding";
                } finally {
                  setBusyKey(null);
                }
              });
            }}
          >
            Replay
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || busyKey !== null}
            onClick={() => {
              startTransition(async () => {
                setBusyKey("onboarding");
                try {
                  await fetch("/api/onboarding", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reset" }),
                  });
                  setToast(makeFlashToast("Onboarding reset", "info"));
                } finally {
                  setBusyKey(null);
                }
              });
            }}
          >
            Reset
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Agency templates</h2>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-border px-3 py-3">
              <p className="text-sm font-medium text-fg">{t.name}</p>
              <p className="mt-1 text-xs text-fg-muted">{t.priorityNotes}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Knowledge Graph™</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Industries, patterns, recommendation rules, and industry playbooks.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <Button type="button" size="sm" variant="secondary" href="/dashboard/knowledge">
            Open Knowledge Center
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Business Goals</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Define growth targets that bias Today&apos;s Priority Engine.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <Button type="button" size="sm" variant="secondary" href="/dashboard/goals">
            Manage goals
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">System</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Health checks, Trust Engine™ flags, and recent analysis failures.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <Button type="button" size="sm" variant="secondary" href="/dashboard/system">
            Open system health
          </Button>
        </CardBody>
      </Card>

      <PulseCadenceSettings />

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Privacy Center™</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Smart Consent™, Cookie Intelligence™, consent history, and data export.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <Button type="button" size="sm" href="/dashboard/settings/privacy">
            Open Privacy Center™
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Email &amp; Growth Digest™</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Weekly digest frequency, channel opt-ins, and Email Center.
            </p>
          </div>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          <Button type="button" size="sm" href="/dashboard/settings/email">
            Email preferences
          </Button>
          <Button type="button" size="sm" variant="secondary" href="/dashboard/email">
            Email Center
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">Account</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Profile, email, connected accounts, and security.
            </p>
          </div>
        </CardHeader>
        <CardBody className="pt-4">
          <AccountProfile />
        </CardBody>
      </Card>
    </div>
  );
}
