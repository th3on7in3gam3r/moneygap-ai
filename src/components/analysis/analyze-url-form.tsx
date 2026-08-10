"use client";

import { AlertTriangle, Loader2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConnectivityDiagnosticsPanel } from "@/components/analysis/connectivity-diagnostics-panel";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { GOAL_OPTIONS } from "@/lib/onboarding/constants";
import {
  clearSandboxHandoff,
  readSandboxHandoff,
} from "@/lib/public-diagnostics/sandbox-storage";
import type { ConnectivityDiagnostics } from "@/lib/scan/connectivity/types";
import type { EstimateResult, ScanProfile } from "@/lib/scan/types";
import { cn } from "@/lib/utils";

type ProfileOption = {
  id: ScanProfile;
  label: string;
  description: string;
  maxPages: number;
  locked?: boolean;
};

export function AnalyzeUrlForm({
  initialUrl = "",
  autoStart = false,
  forcedProfile,
}: {
  initialUrl?: string;
  /** When true with a URL, estimate then start the scan automatically. */
  autoStart?: boolean;
  /** When set (e.g. extension handoff), auto-start uses this profile — not the estimate recommendation. */
  forcedProfile?: ScanProfile;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<ConnectivityDiagnostics | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [scanProfile, setScanProfile] = useState<ScanProfile>(
    forcedProfile ?? "quick",
  );
  const [allowedProfiles, setAllowedProfiles] = useState<ScanProfile[] | null>(
    null,
  );
  const [suggestedPlan, setSuggestedPlan] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [sandboxBanner, setSandboxBanner] = useState<{
    url: string;
    score: number;
  } | null>(null);
  const [autoStarting, setAutoStarting] = useState(false);
  const autoStartRan = useRef(false);

  useEffect(() => {
    if (initialUrl) return;
    const handoff = readSandboxHandoff();
    if (!handoff) return;
    setUrl(handoff.url);
    setSandboxBanner({ url: handoff.url, score: handoff.score });
  }, [initialUrl]);

  function resolveStartProfile(
    recommended: ScanProfile,
    allowed: ScanProfile[] | null | undefined,
  ): ScanProfile {
    const preferred = forcedProfile ?? recommended;
    if (allowed?.length && !allowed.includes(preferred)) {
      return allowed.includes("quick") ? "quick" : allowed[0]!;
    }
    return preferred;
  }

  async function fetchEstimate(targetUrl: string): Promise<{
    ok: boolean;
    estimate?: EstimateResult;
    profiles?: ProfileOption[];
    allowedProfiles?: ScanProfile[];
    suggestedPlan?: string | null;
    diagnostics?: ConnectivityDiagnostics;
    error?: string;
  }> {
    const res = await fetch("/api/scan/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
    });
    const data = (await res.json()) as {
      estimate?: EstimateResult;
      profiles?: ProfileOption[];
      allowedProfiles?: ScanProfile[];
      suggestedPlan?: string | null;
      diagnostics?: ConnectivityDiagnostics;
      error?: string;
    };
    if (!res.ok || !data.estimate) {
      return {
        ok: false,
        diagnostics: data.diagnostics,
        error: data.error ?? "Could not estimate this website.",
      };
    }
    return {
      ok: true,
      estimate: data.estimate,
      profiles: data.profiles,
      allowedProfiles: data.allowedProfiles,
      suggestedPlan: data.suggestedPlan,
      diagnostics: data.diagnostics,
    };
  }

  async function runEstimate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDiagnostics(null);
    setEstimating(true);
    setEstimate(null);
    try {
      const result = await fetchEstimate(url);
      if (result.diagnostics) setDiagnostics(result.diagnostics);
      if (!result.ok || !result.estimate) {
        setError(result.error ?? "Could not estimate this website.");
        setEstimating(false);
        return;
      }
      setEstimate(result.estimate);
      setProfiles(result.profiles ?? []);
      setAllowedProfiles(result.allowedProfiles ?? null);
      setSuggestedPlan(result.suggestedPlan ?? null);
      setScanProfile(
        resolveStartProfile(
          result.estimate.recommendedProfile,
          result.allowedProfiles,
        ),
      );
      setEstimating(false);
    } catch {
      setError("Could not estimate this website.");
      setEstimating(false);
    }
  }

  async function startScan(opts?: {
    targetUrl?: string;
    profile?: ScanProfile;
  }) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: opts?.targetUrl ?? estimate?.url ?? url,
          scanProfile: opts?.profile ?? scanProfile,
          ...(businessName.trim() ? { businessName: businessName.trim() } : {}),
          ...(industry.trim() ? { industry: industry.trim() } : {}),
          ...(businessGoal.trim() ? { businessGoal: businessGoal.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        analysisId?: string;
        error?: string;
        code?: string;
        suggestedPlan?: string;
        diagnostics?: ConnectivityDiagnostics;
      };
      if (data.diagnostics) setDiagnostics(data.diagnostics);
      if (!res.ok || !data.analysisId) {
        if (data.suggestedPlan) setSuggestedPlan(data.suggestedPlan);
        setError(data.error ?? "We couldn't start this analysis. Please try again.");
        setSubmitting(false);
        setAutoStarting(false);
        return;
      }
      clearSandboxHandoff();
      router.push(`/dashboard/analyze/${data.analysisId}`);
    } catch {
      setError("We couldn't start this analysis. Please try again.");
      setSubmitting(false);
      setAutoStarting(false);
    }
  }

  useEffect(() => {
    if (!autoStart || autoStartRan.current) return;
    const target = initialUrl.trim();
    if (!target) return;
    autoStartRan.current = true;
    setAutoStarting(true);
    setError(null);
    setDiagnostics(null);
    setEstimating(true);
    setEstimate(null);

    void (async () => {
      try {
        const result = await fetchEstimate(target);
        if (result.diagnostics) setDiagnostics(result.diagnostics);
        if (!result.ok || !result.estimate) {
          setError(result.error ?? "Could not estimate this website.");
          setEstimating(false);
          setAutoStarting(false);
          return;
        }
        setEstimate(result.estimate);
        setProfiles(result.profiles ?? []);
        setAllowedProfiles(result.allowedProfiles ?? null);
        setSuggestedPlan(result.suggestedPlan ?? null);
        const profile = resolveStartProfile(
          result.estimate.recommendedProfile,
          result.allowedProfiles,
        );
        setScanProfile(profile);
        setEstimating(false);
        await startScan({
          targetUrl: result.estimate.url,
          profile,
        });
      } catch {
        setError("Could not estimate this website.");
        setEstimating(false);
        setAutoStarting(false);
      }
    })();
    // Intentionally once on handoff mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialUrl, forcedProfile]);

  const profileList: ProfileOption[] = (
    profiles.length
      ? profiles
      : (["quick", "standard", "deep", "enterprise"] as ScanProfile[]).map(
          (id) => ({
            id,
            label: id,
            description: "",
            maxPages: 0,
          }),
        )
  ).map((p) => ({
    ...p,
    locked: Boolean(allowedProfiles && !allowedProfiles.includes(p.id)),
  }));

  return (
    <Card>
      <CardBody>
        <form
          onSubmit={
            estimate
              ? (e) => {
                  e.preventDefault();
                  void startScan();
                }
              : runEstimate
          }
          className="space-y-4"
        >
          {autoStarting ? (
            <div className="flex gap-3 rounded-xl border border-accent/30 bg-accent-soft/50 px-3.5 py-3">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-fg">
                  Starting your MoneyGap Engine™{" "}
                  {forcedProfile === "quick" ? "Basics" : ""} scan
                </p>
                <p className="text-xs leading-relaxed text-fg-muted">
                  Checking connectivity
                  {forcedProfile === "quick"
                    ? " and launching a Quick Basics crawl"
                    : ", picking the scan profile, and launching the crawl"}{" "}
                  for{" "}
                  <span className="font-medium text-fg">{url || initialUrl}</span>.
                  No need to re-enter the site.
                </p>
              </div>
            </div>
          ) : null}

          {sandboxBanner && !autoStarting ? (
            <div className="flex gap-3 rounded-xl border border-accent/30 bg-accent-soft/50 px-3.5 py-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-fg">
                  Continue from your free sandbox scan
                </p>
                <p className="text-xs leading-relaxed text-fg-muted">
                  Sandbox score {sandboxBanner.score}/100 for{" "}
                  <span className="font-medium text-fg">{sandboxBanner.url}</span>.
                  Run the full MoneyGap Engine™ for Fix Paths™ and Opportunity Index™.
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-fg-subtle hover:text-fg"
                  onClick={() => {
                    clearSandboxHandoff();
                    setSandboxBanner(null);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="website-url" className="text-sm font-medium text-fg">
              Website URL
            </label>
            <input
              id="website-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setEstimate(null);
                setDiagnostics(null);
                setError(null);
              }}
              disabled={submitting || estimating}
              className="mt-2 h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="business-name"
                className="text-xs font-medium text-fg-muted"
              >
                Business name{" "}
                <span className="text-fg-subtle">(optional)</span>
              </label>
              <input
                id="business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={submitting || estimating}
                placeholder="Acme Inc"
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label
                htmlFor="industry"
                className="text-xs font-medium text-fg-muted"
              >
                Industry <span className="text-fg-subtle">(optional)</span>
              </label>
              <input
                id="industry"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={submitting || estimating}
                placeholder="SaaS, e-commerce…"
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label
                htmlFor="business-goal"
                className="text-xs font-medium text-fg-muted"
              >
                Business goal{" "}
                <span className="text-fg-subtle">(optional)</span>
              </label>
              <select
                id="business-goal"
                value={businessGoal}
                onChange={(e) => setBusinessGoal(e.target.value)}
                disabled={submitting || estimating}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              >
                <option value="">Select a goal</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {estimate ? (
            <div className="space-y-4 rounded-xl border border-border bg-bg-muted/40 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                  Pre-scan estimate
                </p>
                <p className="mt-1 text-sm text-fg">
                  <span className="font-semibold">{estimate.domain}</span>
                  {" · "}
                  ~{estimate.estimatedPages.toLocaleString()} pages
                  {" · "}
                  {estimate.complexity} complexity
                  {estimate.framework !== "unknown"
                    ? ` · ${estimate.framework}`
                    : ""}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                  {estimate.guidance}
                </p>
                {estimate.warnings?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                    {estimate.warnings.map((w) => (
                      <li key={w}>· {w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {(estimate.connectivity ?? diagnostics) ? (
                <ConnectivityDiagnosticsPanel
                  diagnostics={estimate.connectivity ?? diagnostics!}
                />
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                {profileList.map((p) => {
                  const eta = estimate.etaByProfile[p.id];
                  const selected = scanProfile === p.id;
                  const recommended = estimate.recommendedProfile === p.id;
                  const locked = Boolean(p.locked);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (!locked) setScanProfile(p.id);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
                        locked
                          ? "cursor-not-allowed border-border/60 opacity-70"
                          : selected
                            ? "border-accent bg-accent-soft/40"
                            : "border-border hover:border-border-strong",
                      )}
                    >
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                        {p.label}
                        {locked ? (
                          <Lock className="h-3.5 w-3.5 text-fg-subtle" />
                        ) : null}
                        {recommended && !locked ? (
                          <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                            Recommended
                          </span>
                        ) : null}
                        {locked ? (
                          <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
                            Upgrade
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {locked
                          ? "Available on Starter and above"
                          : `${eta?.etaLabel ?? "—"}${
                              p.maxPages
                                ? ` · up to ${p.maxPages.toLocaleString()} pages`
                                : ""
                            }`}
                      </p>
                    </button>
                  );
                })}
              </div>

              {allowedProfiles &&
              allowedProfiles.length === 1 &&
              allowedProfiles[0] === "quick" ? (
                <p className="text-xs text-fg-muted">
                  Free includes Basics (Quick) scans.{" "}
                  <Link
                    href="/pricing"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Upgrade to {suggestedPlan ?? "Starter"}
                  </Link>{" "}
                  for Standard and Deep crawls.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex gap-3 rounded-xl border border-border bg-bg-muted/60 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
              <p className="text-xs leading-relaxed text-fg-muted">
                We run staged connectivity diagnostics (DNS, TLS, homepage, robots,
                sitemap) then recommend a scan profile.
              </p>
            </div>
          )}

          {error && (
            <div className="space-y-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
              <p className="text-sm text-danger">{error}</p>
              {suggestedPlan ? (
                <p className="text-xs text-fg-muted">
                  <Link
                    href="/pricing"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    View {suggestedPlan} plans
                  </Link>
                </p>
              ) : null}
              {diagnostics ? (
                <ConnectivityDiagnosticsPanel diagnostics={diagnostics} defaultOpen />
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {estimate ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={submitting}
                  onClick={() => {
                    setEstimate(null);
                    setDiagnostics(null);
                  }}
                >
                  Back
                </Button>
                <Button type="submit" size="lg" disabled={submitting} className="sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    "Start scan"
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={estimating || !url.trim()}
                className="w-full sm:w-auto"
              >
                {estimating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking connectivity…
                  </>
                ) : (
                  "Estimate & choose profile"
                )}
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
