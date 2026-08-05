"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Globe,
  Users,
  Plug,
  ArrowRight,
} from "lucide-react";
import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { ConnectivityDiagnosticsPanel } from "@/components/analysis/connectivity-diagnostics-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  FlashToast,
  makeFlashToast,
  type FlashToastState,
} from "@/components/ui/flash-toast";
import { MoneyGapScore } from "@/components/money-gap";
import { GOAL_OPTIONS, PERSONA_OPTIONS } from "@/lib/onboarding/constants";
import { readSandboxHandoff } from "@/lib/public-diagnostics/sandbox-storage";
import type { ConnectivityDiagnostics } from "@/lib/scan/connectivity/types";
import type { EstimateResult, ScanProfile } from "@/lib/scan/types";
import { cn } from "@/lib/utils";
import type {
  DiscoverySignals,
  OnboardingPersonaRole,
  OnboardingStepId,
  WorkspaceOnboarding,
} from "@/db/schema";

type ChecklistPayload = {
  steps: {
    id: string;
    title: string;
    description: string;
    href: string;
    done: boolean;
    dismissed: boolean;
  }[];
  progress: { done: number; total: number; percent: number };
  celebrateComplete?: boolean;
};

type FirstResults = {
  reportId: string;
  moneyGapScore: number | null;
  gapsFound: number;
  topOpportunity: {
    id: string;
    title: string;
    category: string;
    confidence: number | null;
    estimatedImpact: number | null;
    estimatedRange: { low: number; high: number; label: "AI Estimate" } | null;
  } | null;
  primaryFixPath: { id: string; title: string; reason: string } | null;
  recommendedNextStep: string;
} | null;

type IntegrationRow = {
  slug: string;
  name: string;
  status: string;
  connection: { status: string } | null;
};

const FEATURED_INTEGRATIONS = [
  "google_analytics",
  "google_search_console",
  "github",
  "vercel",
  "stripe",
  "hubspot",
  "cloudflare_pages",
  "mailchimp",
  "resend",
];

export function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<FlashToastState>(null);
  const [onboarding, setOnboarding] = useState<WorkspaceOnboarding | null>(null);
  const [checklist, setChecklist] = useState<ChecklistPayload | null>(null);
  const [firstResults, setFirstResults] = useState<FirstResults>(null);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [url, setUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [persona, setPersona] = useState<OnboardingPersonaRole | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [copilotHref, setCopilotHref] = useState("/dashboard/copilot");
  const [scanProfile, setScanProfile] = useState<ScanProfile>("quick");
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [connectivityDiagnostics, setConnectivityDiagnostics] =
    useState<ConnectivityDiagnostics | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/onboarding", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      enabled?: boolean;
      onboarding?: WorkspaceOnboarding;
      checklist?: ChecklistPayload;
      firstResults?: FirstResults;
    };
    if (data.enabled === false) {
      router.replace("/dashboard");
      return;
    }
    if (data.onboarding) {
      setOnboarding(data.onboarding);
      setStep(data.onboarding.currentStep);
      const savedUrl = data.onboarding.primaryWebsiteUrl ?? "";
      if (savedUrl) {
        setUrl(savedUrl);
      } else {
        const handoff = readSandboxHandoff();
        if (handoff?.url) setUrl(handoff.url);
      }
      setCompanyName(data.onboarding.companyName ?? "");
      setIndustry(data.onboarding.industry ?? "");
      setBusinessModel(data.onboarding.businessModel ?? "");
      setTeamSize(data.onboarding.teamSize ?? "");
      setGoals(data.onboarding.primaryGoals ?? []);
      setPersona(data.onboarding.personaRole);
      setAnalysisId(data.onboarding.analysisId);
    }
    if (data.checklist) setChecklist(data.checklist);
    if (data.firstResults) setFirstResults(data.firstResults);
  }, [router]);

  useEffect(() => {
    void (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    if (step !== "website" && step !== "integrations") return;
    if (step === "website" && onboarding?.primaryWebsiteUrl) {
      const t = setInterval(() => void refresh(), 2000);
      return () => clearInterval(t);
    }
  }, [step, onboarding?.primaryWebsiteUrl, refresh]);

  useEffect(() => {
    if (step !== "integrations") return;
    void (async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) return;
      const data = (await res.json()) as { providers?: IntegrationRow[] };
      setIntegrations(data.providers ?? []);
    })();
  }, [step]);

  async function patch(action: string, extra?: Record<string, unknown>) {
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(makeFlashToast(err.error ?? "Something went wrong", "error"));
      return null;
    }
    const data = (await res.json()) as { onboarding?: WorkspaceOnboarding };
    if (data.onboarding) {
      setOnboarding(data.onboarding);
      setStep(data.onboarding.currentStep);
    }
    return data;
  }

  async function go(next: OnboardingStepId) {
    setBusy(true);
    try {
      await patch("set_step", { step: next });
      setStep(next);
    } finally {
      setBusy(false);
    }
  }

  async function startSetup() {
    setBusy(true);
    try {
      await patch("set_step", { step: "website" });
      setStep("website");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    try {
      await patch("skip");
      setToast(
        makeFlashToast("Setup skipped — we’ll remind you gently.", "info", {
          href: "/dashboard",
          hrefLabel: "Open dashboard →",
        }),
      );
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  async function enterDemo() {
    setBusy(true);
    try {
      await fetch("/api/onboarding/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enter" }),
      });
      router.push("/dashboard/onboarding/demo");
    } finally {
      setBusy(false);
    }
  }

  async function submitWebsite() {
    if (!url.trim()) {
      setToast(makeFlashToast("Enter your primary website URL", "error"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(makeFlashToast(err.error ?? "Could not start discovery", "error"));
        return;
      }
      setToast(makeFlashToast("Discovery started — continuing setup…", "success"));
      await go("profile");
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile() {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          industry,
          businessModel,
          teamSize,
          primaryGoals: goals,
          websiteUrl: url || onboarding?.primaryWebsiteUrl,
          currentStep: "role",
        }),
      });
      if (!res.ok) {
        setToast(makeFlashToast("Could not save profile", "error"));
        return;
      }
      setStep("role");
      setToast(makeFlashToast("Business Memory™ updated", "success"));
    } finally {
      setBusy(false);
    }
  }

  async function submitRole() {
    if (!persona) {
      setToast(makeFlashToast("Pick the role that fits you best", "error"));
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaRole: persona,
          companyName,
          industry,
          businessModel,
          teamSize,
          primaryGoals: goals,
          currentStep: "integrations",
        }),
      });
      setStep("integrations");
    } finally {
      setBusy(false);
    }
  }

  async function connectIntegration(slug: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/integrations/${slug}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        mode?: string;
        url?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setToast(
          makeFlashToast(
            data.error ?? data.message ?? "Could not start connect",
            "info",
          ),
        );
        return;
      }
      if (data.mode === "redirect" && data.url) {
        window.location.href = data.url;
        return;
      }
      setToast(
        makeFlashToast(
          data.message ?? "Saved — you can finish this connection later in Integration Hub™.",
          "info",
        ),
      );
      const list = await fetch("/api/integrations");
      if (list.ok) {
        const body = (await list.json()) as { providers?: IntegrationRow[] };
        setIntegrations(body.providers ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  async function runScanEstimate() {
    const target = url || onboarding?.primaryWebsiteUrl;
    if (!target) {
      setToast(makeFlashToast("Add a website URL first.", "error"));
      return;
    }
    setEstimating(true);
    setConnectivityDiagnostics(null);
    try {
      const res = await fetch("/api/scan/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await res.json()) as {
        estimate?: EstimateResult;
        diagnostics?: ConnectivityDiagnostics;
        error?: string;
      };
      if (data.diagnostics) setConnectivityDiagnostics(data.diagnostics);
      if (!res.ok || !data.estimate) {
        setToast(
          makeFlashToast(data.error ?? "Could not estimate this website.", "error"),
        );
        return;
      }
      setEstimate(data.estimate);
      // Onboarding prefers quick when viable; otherwise follow the estimator.
      setScanProfile(
        data.estimate.recommendedProfile === "quick" ||
          data.estimate.estimatedPages <= 40
          ? "quick"
          : data.estimate.recommendedProfile,
      );
    } finally {
      setEstimating(false);
    }
  }

  async function startScan() {
    setBusy(true);
    setToast(makeFlashToast("Checking that the website is reachable…", "info"));
    try {
      const res = await fetch("/api/onboarding/start-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url || onboarding?.primaryWebsiteUrl,
          scanProfile,
        }),
      });
      const data = (await res.json()) as {
        analysisId?: string;
        error?: string;
        message?: string;
        code?: string;
        diagnostics?: ConnectivityDiagnostics;
      };
      if (data.diagnostics) setConnectivityDiagnostics(data.diagnostics);
      if (!res.ok) {
        setToast(
          makeFlashToast(data.error ?? data.message ?? "Could not start scan", "error", {
            href: data.code === "upgrade_required" ? "/dashboard/billing" : undefined,
            hrefLabel: "View billing →",
          }),
        );
        return;
      }
      setAnalysisId(data.analysisId ?? null);
      setStep("scan");
      setToast(makeFlashToast("Website verified — scan started", "success"));
    } finally {
      setBusy(false);
    }
  }

  async function tryAnotherUrlFromScan() {
    setBusy(true);
    try {
      await patch("set_step", { step: "website" });
      setAnalysisId(null);
      setStep("website");
    } finally {
      setBusy(false);
    }
  }

  async function retryScanFromFailure() {
    setAnalysisId(null);
    await startScan();
  }

  const onScanComplete = useCallback(
    async (reportId: string) => {
      setToast(makeFlashToast("First scan completed!", "success"));
      const res = await fetch("/api/onboarding/link-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, analysisId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { firstResults?: FirstResults };
        setFirstResults(data.firstResults ?? null);
      }
      setStep("results");
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "celebration_ack", key: "first_scan" }),
      }).catch(() => null);
      await refresh();
    },
    [analysisId, refresh],
  );

  async function finishOnboarding() {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const data = (await res.json()) as {
        firstResults?: FirstResults;
        copilotHref?: string;
        error?: string;
      };
      if (!res.ok) {
        setToast(makeFlashToast(data.error ?? "Could not complete setup", "error"));
        return;
      }
      if (data.firstResults) setFirstResults(data.firstResults);
      if (data.copilotHref) setCopilotHref(data.copilotHref);
      setStep("complete");
      setToast(makeFlashToast("Setup complete — welcome to MoneyGap AI", "success"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-fg-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const discovery = onboarding?.discoverySignals as DiscoverySignals | null | undefined;
  const progressPct = checklist?.progress.percent ?? 0;

  return (
    <div className="relative mx-auto max-w-3xl space-y-8 pb-16">
      <FlashToast toast={toast} onDismiss={dismissToast} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Intelligent Onboarding™
          </p>
          <Badge tone="neutral">{progressPct}% ready</Badge>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>
      </div>

      {step === "welcome" && (
        <Card>
          <CardBody className="space-y-6 py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Sparkles className="size-7" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome to MoneyGap AI
              </h1>
              <p className="mx-auto max-w-lg text-sm text-fg-muted sm:text-base">
                Discover where your business is losing opportunities—and how to fix them.
              </p>
              <p className="text-xs text-fg-subtle">Estimated setup time: about 2 minutes.</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" disabled={busy} onClick={() => void startSetup()}>
                Start Setup
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={busy}
                onClick={() => void enterDemo()}
              >
                Explore Demo Workspace
              </Button>
            </div>
            <button
              type="button"
              className="text-sm text-fg-subtle underline-offset-2 hover:text-fg-muted hover:underline"
              disabled={busy}
              onClick={() => void skip()}
            >
              Skip for now
            </button>
          </CardBody>
        </Card>
      )}

      {step === "website" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-xl font-semibold">Your primary website</h2>
              <p className="mt-1 text-sm text-fg-muted">
                We’ll start lightweight discovery while you continue setup.
              </p>
            </div>
            <Globe className="size-5 text-accent" />
          </CardHeader>
          <CardBody className="space-y-4">
            <label className="grid gap-1.5 text-xs font-medium text-fg-muted">
              Website URL
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitWebsite();
                }}
              />
            </label>
            <p className="text-xs leading-relaxed text-fg-muted">
              Full AI scans usually take a few minutes. Larger sites can take up to{" "}
              <span className="font-medium text-fg">10–15 minutes</span> to complete.
              {url && !onboarding?.primaryWebsiteUrl ? (
                <>
                  {" "}
                  Prefilling from your free sandbox scan — continue to run the full
                  MoneyGap Engine™ for Fix Paths™.
                </>
              ) : null}
            </p>
            <DiscoveryChips signals={discovery} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => void go("welcome")}>
                Back
              </Button>
              <Button disabled={busy} onClick={() => void submitWebsite()}>
                {busy ? "Starting…" : "Continue"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "profile" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-xl font-semibold">Business profile</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Stored as Business Memory™ for Growth Copilot™.
              </p>
            </div>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name" value={companyName} onChange={setCompanyName} />
            <Field label="Industry" value={industry} onChange={setIndustry} placeholder="e.g. SaaS, Ecommerce" />
            <Field
              label="Business model"
              value={businessModel}
              onChange={setBusinessModel}
              placeholder="e.g. B2B subscription"
            />
            <Field
              label="Team size"
              value={teamSize}
              onChange={setTeamSize}
              placeholder="e.g. 1–5, 6–20"
            />
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-medium text-fg-muted">Primary goals</p>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((g) => {
                  const on = goals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setGoals((prev) =>
                          on ? prev.filter((x) => x !== g.id) : [...prev, g.id],
                        )
                      }
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                        on
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border text-fg-muted hover:border-border-strong",
                      )}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
              <Button variant="ghost" disabled={busy} onClick={() => void go("website")}>
                Back
              </Button>
              <Button disabled={busy} onClick={() => void submitProfile()}>
                Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "role" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-xl font-semibold">Who are you?</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Personalizes Copilot mode, recommendations, and Fix Paths™.
              </p>
            </div>
            <Users className="size-5 text-accent" />
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {PERSONA_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition",
                    persona === p.id
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <p className="text-sm font-semibold text-fg">{p.label}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{p.description}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => void go("profile")}>
                Back
              </Button>
              <Button disabled={busy} onClick={() => void submitRole()}>
                Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "integrations" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-xl font-semibold">Connect your tools</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Optional — skip and reconnect anytime in Integration Hub™.
              </p>
            </div>
            <Plug className="size-5 text-accent" />
          </CardHeader>
          <CardBody className="space-y-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {FEATURED_INTEGRATIONS.map((slug) => {
                const row = integrations.find((i) => i.slug === slug);
                const name =
                  row?.name ??
                  slug
                    .split("_")
                    .map((w) => w[0]!.toUpperCase() + w.slice(1))
                    .join(" ");
                const connected = row?.connection?.status === "connected";
                const live = slug === "github" || slug === "stripe";
                return (
                  <li
                    key={slug}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-fg">{name}</p>
                      <p className="text-[11px] text-fg-subtle">
                        {connected
                          ? "Connected"
                          : live
                            ? "Ready to connect"
                            : "Available later / pending"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || connected}
                      onClick={() => void connectIntegration(slug)}
                    >
                      {connected ? "Done" : "Connect"}
                    </Button>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-3 rounded-xl border border-border bg-bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                    Scan profile
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Estimate your site, then pick Quick (default for onboarding) or a deeper crawl.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || estimating}
                  onClick={() => void runScanEstimate()}
                >
                  {estimating ? "Estimating…" : estimate ? "Re-estimate" : "Estimate site"}
                </Button>
              </div>
              {estimate ? (
                <p className="text-xs text-fg">
                  ~{estimate.estimatedPages.toLocaleString()} pages · {estimate.complexity}{" "}
                  complexity
                  {estimate.framework !== "unknown" ? ` · ${estimate.framework}` : ""}
                </p>
              ) : null}
              {connectivityDiagnostics ? (
                <ConnectivityDiagnosticsPanel
                  diagnostics={connectivityDiagnostics}
                  defaultOpen={!connectivityDiagnostics.ok}
                />
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "quick" as const,
                      label: "Quick",
                      hint: "Fast first results",
                    },
                    {
                      id: "standard" as const,
                      label: "Standard",
                      hint: "Up to 250 pages",
                    },
                    {
                      id: "deep" as const,
                      label: "Deep",
                      hint: "Large sites, resumable",
                    },
                    {
                      id: "enterprise" as const,
                      label: "Enterprise",
                      hint: "Very large sites",
                    },
                  ] as const
                ).map((p) => {
                  const selected = scanProfile === p.id;
                  const recommended = estimate?.recommendedProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setScanProfile(p.id)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition",
                        selected
                          ? "border-accent bg-accent-soft/40"
                          : "border-border hover:border-border-strong",
                      )}
                    >
                      <p className="text-sm font-semibold text-fg">
                        {p.label}
                        {recommended ? (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-accent">
                            Recommended
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {estimate?.etaByProfile[p.id]?.etaLabel ?? p.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => void go("role")}>
                Back
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void startScan()}>
                Skip & start scan
              </Button>
              <Button disabled={busy} onClick={() => void startScan()}>
                Start AI scan
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "scan" && analysisId && (
        <div className="space-y-4">
          <AnalysisProgress
            analysisId={analysisId}
            stayOnComplete
            title="AI initial scan"
            eyebrow="MoneyGap Engine™"
            onComplete={(reportId) => void onScanComplete(reportId)}
            onTryAnotherUrl={() => void tryAnotherUrlFromScan()}
            onRetry={() => void retryScanFromFailure()}
          />
          <p className="text-center text-xs text-fg-subtle">
            Missing integrations are skipped — we continue with available checks.
          </p>
        </div>
      )}

      {step === "scan" && !analysisId && (
        <Card>
          <CardBody className="space-y-4 py-10 text-center">
            <p className="text-sm text-fg-muted">Starting a new scan…</p>
            <Button disabled={busy} onClick={() => void startScan()}>
              Start AI scan
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void tryAnotherUrlFromScan()}
            >
              Enter a different URL
            </Button>
          </CardBody>
        </Card>
      )}

      {(step === "results" || step === "complete") && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-xl font-semibold">
                {step === "complete" ? "You’re ready" : "Your first results"}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Highest-impact opportunity first — not every finding at once.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-6">
              {firstResults?.moneyGapScore != null ? (
                <MoneyGapScore score={firstResults.moneyGapScore} size="md" />
              ) : (
                <div className="text-sm text-fg-muted">Score preparing…</div>
              )}
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-fg-muted">Money Gaps found: </span>
                  <span className="font-semibold">{firstResults?.gapsFound ?? "—"}</span>
                </p>
                {firstResults?.topOpportunity && (
                  <>
                    <p>
                      <span className="text-fg-muted">Top opportunity: </span>
                      <span className="font-semibold">
                        {firstResults.topOpportunity.title}
                      </span>
                    </p>
                    {firstResults.topOpportunity.estimatedRange && (
                      <p>
                        <span className="text-fg-muted">Opportunity range: </span>
                        <span className="font-semibold">
                          ${firstResults.topOpportunity.estimatedRange.low.toLocaleString()}–
                          ${firstResults.topOpportunity.estimatedRange.high.toLocaleString()}
                        </span>{" "}
                        <Badge tone="neutral">AI Estimate</Badge>
                      </p>
                    )}
                    {firstResults.topOpportunity.confidence != null && (
                      <p>
                        <span className="text-fg-muted">Confidence: </span>
                        <span className="font-semibold">
                          {firstResults.topOpportunity.confidence}%
                        </span>
                      </p>
                    )}
                  </>
                )}
                {firstResults?.primaryFixPath && (
                  <p>
                    <span className="text-fg-muted">Primary Fix Path™: </span>
                    <span className="font-semibold">{firstResults.primaryFixPath.title}</span>
                  </p>
                )}
              </div>
            </div>
            {firstResults?.recommendedNextStep && (
              <p className="rounded-xl border border-accent/25 bg-accent-soft/40 px-4 py-3 text-sm text-fg">
                {firstResults.recommendedNextStep}
              </p>
            )}

            {step === "results" && (
              <div className="flex flex-wrap gap-2">
                {firstResults?.reportId && (
                  <Button href={`/reports/${firstResults.reportId}`} size="sm">
                    Open Growth Report
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void finishOnboarding()}
                >
                  Meet Growth Copilot™
                </Button>
              </div>
            )}

            {step === "complete" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-bg px-4 py-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
                  <p className="text-sm leading-relaxed text-fg">
                    Welcome! I analyzed your website and found several opportunities. Based on
                    your goals, start with your highest-impact Fix Path™. I’ll keep monitoring
                    and notify you when new opportunities appear.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={copilotHref}>Open Growth Copilot™</Button>
                  <Button href="/dashboard" variant="secondary">
                    Go to dashboard
                  </Button>
                  {firstResults?.reportId && (
                    <Button href={`/reports/${firstResults.reportId}`} variant="ghost">
                      View report
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {checklist && step !== "welcome" && (
        <Card>
          <CardHeader>
            <h3 className="font-display text-lg font-semibold">Setup checklist</h3>
            <Badge tone="accent">
              {checklist.progress.done}/{checklist.progress.total}
            </Badge>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {checklist.steps
                .filter((s) => !s.dismissed)
                .map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {s.done ? (
                        <CheckCircle2 className="size-4 text-accent" />
                      ) : (
                        <span className="size-4 rounded-full border border-border-strong" />
                      )}
                      {s.title}
                    </span>
                    {!s.done && (
                      <a href={s.href} className="text-xs font-medium text-accent hover:underline">
                        Open
                      </a>
                    )}
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-fg-muted">
      {label}
      <input
        className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function DiscoveryChips({ signals }: { signals?: DiscoverySignals | null }) {
  if (!signals) {
    return (
      <p className="text-xs text-fg-subtle">
        Discovery runs in the background after you continue.
      </p>
    );
  }
  if (signals.error && !signals.meta && !signals.dns) {
    return <p className="text-xs text-danger">Discovery: {signals.error}</p>;
  }
  const chips: { label: string; ok?: boolean }[] = [
    { label: `SSL ${signals.ssl?.ok ? "OK" : "check"}`, ok: signals.ssl?.ok },
    { label: `DNS ${signals.dns?.ok ? "OK" : "…"}`, ok: signals.dns?.ok },
    {
      label: signals.hosting?.provider
        ? `Hosting: ${signals.hosting.provider}`
        : "Hosting…",
      ok: !!signals.hosting?.provider,
    },
    {
      label: signals.cms?.name ? `CMS: ${signals.cms.name}` : "CMS…",
      ok: !!signals.cms?.name,
    },
    {
      label: signals.framework?.name
        ? `Framework: ${signals.framework.name}`
        : "Framework…",
      ok: !!signals.framework?.name,
    },
    {
      label: signals.meta?.title ? `Title: ${signals.meta.title.slice(0, 40)}` : "Metadata…",
      ok: !!signals.meta?.title,
    },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[11px]",
            c.ok
              ? "border-accent/30 bg-accent-soft/50 text-fg"
              : "border-border text-fg-subtle",
          )}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
