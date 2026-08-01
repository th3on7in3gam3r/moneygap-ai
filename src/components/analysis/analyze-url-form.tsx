"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export function AnalyzeUrlForm({ initialUrl = "" }: { initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
              Enter a public website. We&apos;ll crawl key pages and generate a Website Intelligence
              Report.
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
                Starting analysis…
              </>
            ) : (
              "Analyze website"
            )}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
