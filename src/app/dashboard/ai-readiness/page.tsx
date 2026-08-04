"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
  url: string;
};

type Validation = {
  score: number;
  errors: { ruleId: string; message: string }[];
  warnings: { ruleId: string; message: string }[];
  suggestions: { ruleId: string; message: string }[];
  recommendations: {
    title: string;
    priority: string;
    impact: string;
    whyItMatters: string;
    recommendedAction: string;
    estimatedEffort: string;
  }[];
  present: boolean;
};

type Summary = {
  readiness: { score: number; breakdown: Record<string, number> };
  validation: Validation;
  remotePresent: boolean;
  versions: {
    id: string;
    score: number | null;
    rulesetVersion: string | null;
    createdAt: string;
    preview: string;
  }[];
  rulesetVersion: string;
};

export default function AiReadinessDashboardPage() {
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [websiteId, setWebsiteId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load(id?: string) {
    const wid = id ?? websiteId;
    startTransition(() => {
      void (async () => {
        const q = wid ? `?websiteId=${encodeURIComponent(wid)}` : "";
        const res = await fetch(`/api/ai-readiness${q}`);
        if (!res.ok) {
          setError("Could not load AI Readiness");
          return;
        }
        const data = (await res.json()) as Summary & {
          websites: WebsiteOption[];
        };
        setWebsites(data.websites ?? []);
        if (!wid && data.websites?.[0]) {
          setWebsiteId(data.websites[0].id);
          load(data.websites[0].id);
          return;
        }
        if (wid) {
          setSummary({
            readiness: data.readiness,
            validation: data.validation,
            remotePresent: data.remotePresent,
            versions: data.versions,
            rulesetVersion: data.rulesetVersion,
          });
        }
        setError(null);
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function regenerate() {
    if (
      !confirm(
        "Generate a new llms.txt draft and save a version? This does not overwrite your live site file.",
      )
    ) {
      return;
    }
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/ai-readiness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteId, confirm: true }),
        });
        const data = (await res.json()) as {
          content?: string;
          error?: string;
        };
        if (!res.ok || !data.content) {
          setError(data.error ?? "Generate failed");
          return;
        }
        setGenerated(data.content);
        setError(null);
        load(websiteId);
      })();
    });
  }

  function download(content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-muted">
          Health signal
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-fg">
          AI Readiness
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Measure and improve guidance for AI assistants and answer engines —
          including{" "}
          <code className="text-fg">llms.txt</code> validation and generation.
          Observed quality scores are not a legal certification.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Website</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-fg-muted">Select site</span>
            <select
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              value={websiteId}
              onChange={(e) => {
                setWebsiteId(e.target.value);
                load(e.target.value);
              }}
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.domain})
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => load()}>
            Refresh
          </Button>
          <Button type="button" disabled={pending || !websiteId} onClick={regenerate}>
            Regenerate llms.txt
          </Button>
        </CardBody>
      </Card>

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardBody>
                <p className="text-xs text-fg-muted">AI Readiness Score™</p>
                <p className="mt-2 font-display text-4xl font-semibold">
                  {summary.readiness.score}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-fg-muted">llms.txt validation</p>
                <p className="mt-2 font-display text-4xl font-semibold">
                  {summary.validation.score}
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  {summary.remotePresent ? "Live file detected" : "No live file"}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-fg-muted">Ruleset</p>
                <p className="mt-2 font-mono text-sm">{summary.rulesetVersion}</p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Recommendations</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {(summary.validation.recommendations ?? []).slice(0, 8).map((r) => (
                <div key={r.title} className="border-b border-border/60 pb-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{r.title}</p>
                    <Badge>{r.priority}</Badge>
                    <span className="text-xs text-fg-muted">
                      effort: {r.estimatedEffort}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">{r.whyItMatters}</p>
                  <p className="mt-1 text-sm text-fg">{r.recommendedAction}</p>
                </div>
              ))}
              {!summary.validation.recommendations?.length ? (
                <p className="text-sm text-fg-muted">No open recommendations.</p>
              ) : null}
            </CardBody>
          </Card>

          {generated ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Generated draft</h2>
                <Button type="button" size="sm" onClick={() => download(generated)}>
                  Download llms.txt
                </Button>
              </CardHeader>
              <CardBody>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-bg-elevated p-4 text-xs text-fg">
                  {generated}
                </pre>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Version history</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {summary.versions.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  No saved drafts yet. Regenerate to create the first version.
                </p>
              ) : (
                summary.versions.map((v) => (
                  <div
                    key={v.id}
                    className="border-b border-border/50 pb-2 text-sm last:border-0"
                  >
                    <p className="text-fg">
                      {new Date(v.createdAt).toLocaleString()} · score{" "}
                      {v.score ?? "—"} · ruleset {v.rulesetVersion ?? "—"}
                    </p>
                    <p className="mt-1 truncate text-xs text-fg-muted">
                      {v.preview}…
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
