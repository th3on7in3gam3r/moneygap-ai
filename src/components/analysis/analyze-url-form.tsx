"use client";

import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  clearSandboxHandoff,
  readSandboxHandoff,
} from "@/lib/public-diagnostics/sandbox-storage";

export function AnalyzeUrlForm({ initialUrl = "" }: { initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { analysisId?: string; error?: string };
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
        <form onSubmit={onSubmit} className="space-y-4">
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
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
              className="mt-2 h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-fg-muted">
              Enter a public website. We verify it&apos;s reachable first, then crawl key pages and
              generate a Website Intelligence Report.
            </p>
          </div>

          <div className="flex gap-3 rounded-xl border border-border bg-bg-muted/60 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
            <p className="text-xs leading-relaxed text-fg-muted">
              <span className="font-semibold text-fg">Scan time:</span> most sites finish in a few
              minutes. Depending on site size, a full scan can take{" "}
              <span className="font-medium text-fg">up to 10–15 minutes</span>.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={submitting || !url.trim()} className="w-full sm:w-auto">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking website…
              </>
            ) : sandboxBanner ? (
              "Run full AI scan"
            ) : (
              "Analyze website"
            )}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
