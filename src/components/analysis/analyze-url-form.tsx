"use client";

import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectivityDiagnosticsPanel } from "@/components/analysis/connectivity-diagnostics-panel";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
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
};

export function AnalyzeUrlForm({ initialUrl = "" }: { initialUrl?: string }) {
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
  const [scanProfile, setScanProfile] = useState<ScanProfile>("standard");
  const [sandboxBanner, setSandboxBanner] = useState<{
    url: string;
    score: number;
  } | null>(null);

  useEffect(() => {
    if (initialUrl) return;
    const handoff = readSandboxHandoff();
    if (!handoff) return;
    setUrl(handoff.url);
    setSandboxBanner({ url: handoff.url, score: handoff.score });
  }, [initialUrl]);

  async function runEstimate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDiagnostics(null);
    setEstimating(true);
    setEstimate(null);
    try {
      const res = await fetch("/api/scan/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        estimate?: EstimateResult;
        profiles?: ProfileOption[];
        diagnostics?: ConnectivityDiagnostics;
        error?: string;
      };
      if (data.diagnostics) setDiagnostics(data.diagnostics);
      if (!res.ok || !data.estimate) {
        setError(data.error ?? "Could not estimate this website.");
        setEstimating(false);
        return;
      }
      setEstimate(data.estimate);
      setProfiles(data.profiles ?? []);
      setScanProfile(data.estimate.recommendedProfile);
      setEstimating(false);
    } catch {
      setError("Could not estimate this website.");
      setEstimating(false);
    }
  }

  async function startScan() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: estimate?.url ?? url, scanProfile }),
      });
      const data = (await res.json()) as {
        analysisId?: string;
        error?: string;
        diagnostics?: ConnectivityDiagnostics;
      };
      if (data.diagnostics) setDiagnostics(data.diagnostics);
      if (!res.ok || !data.analysisId) {
        setError(data.error ?? "We couldn't start this analysis. Please try again.");
        setSubmitting(false);
        return;
      }
      clearSandboxHandoff();
      router.push(`/dashboard/analyze/${data.analysisId}`);
    } catch {
      setError("We couldn't start this analysis. Please try again.");
      setSubmitting(false);
    }
  }

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
          {sandboxBanner ? (
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
                {(profiles.length
                  ? profiles
                  : (["quick", "standard", "deep", "enterprise"] as ScanProfile[]).map(
                      (id) => ({
                        id,
                        label: id,
                        description: "",
                        maxPages: 0,
                      }),
                    )
                ).map((p) => {
                  const eta = estimate.etaByProfile[p.id];
                  const selected = scanProfile === p.id;
                  const recommended = estimate.recommendedProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setScanProfile(p.id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
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
                      <p className="mt-1 text-xs text-fg-muted">
                        {eta?.etaLabel ?? "—"}
                        {p.maxPages ? ` · up to ${p.maxPages.toLocaleString()} pages` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
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
