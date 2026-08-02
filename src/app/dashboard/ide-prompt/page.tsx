"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowLeft, Check, Copy, Code2 } from "lucide-react";
import type { OpportunityFix } from "@/db/schema";
import {
  EstimateBadge,
  FixPlan,
} from "@/components/money-gap/opportunity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type PromptItem = {
  tool: string;
  title: string;
  intro: string;
  body: string;
};

type Opportunity = {
  id: string;
  reportId: string;
  title: string;
  category: string;
  moduleId: string;
  summary: string | null;
  whatsMissing: string;
  whyItMatters: string;
  businessImpact: string;
  estimatedAnnualRevenue: number | null;
  difficulty: string;
  estimatedTime: string | null;
  opportunityIndex: number;
  fixes: OpportunityFix[] | null;
};

type Payload = {
  opportunity: Opportunity;
  prompts: PromptItem[];
  stackSummary: string | null;
  hasStack: boolean;
};

function getSearchSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function parseQuery(search: string): {
  opportunityId: string | null;
  reportId: string | null;
} {
  const q = new URLSearchParams(search);
  return {
    opportunityId: q.get("opportunityId")?.trim() || null,
    reportId: q.get("reportId")?.trim() || null,
  };
}

export default function IdePromptPage() {
  // Snapshot must be a stable primitive — object snapshots from getSnapshot
  // cause Maximum update depth exceeded.
  const search = useSyncExternalStore(
    () => () => {},
    getSearchSnapshot,
    () => "",
  );
  const query = parseQuery(search);

  const [data, setData] = useState<Payload | null>(null);
  const [tool, setTool] = useState<string>("cursor");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = query.opportunityId;
    if (!id) return;

    let cancelled = false;
    startTransition(() => {
      void (async () => {
        const res = await fetch(
          `/api/developer-mode/ide-prompt?opportunityId=${encodeURIComponent(id)}`,
        );
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? "Could not load IDE prompts");
          setData(null);
          return;
        }
        const body = (await res.json()) as Payload;
        setData(body);
        setTool(body.prompts[0]?.tool ?? "cursor");
        setError(null);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [query.opportunityId]);

  const active = data?.prompts.find((p) => p.tool === tool) ?? data?.prompts[0];
  const reportId = data?.opportunity.reportId ?? query.reportId;
  const opportunityId = data?.opportunity.id ?? query.opportunityId;

  async function copyPrompt() {
    if (!active?.body) return;
    try {
      await navigator.clipboard.writeText(active.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Code + AI · Fix Path
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            IDE Prompt
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            Copy a ready-made prompt for Cursor, Claude, or your IDE of choice.
            Review before applying — never auto-publishes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reportId && (
            <Button href={`/reports/${reportId}`} size="sm" variant="secondary">
              <ArrowLeft className="size-3.5 opacity-70" />
              Back to report
            </Button>
          )}
          <Button
            href={
              opportunityId
                ? `/dashboard/developer-mode?opportunityId=${encodeURIComponent(opportunityId)}`
                : "/dashboard/developer-mode"
            }
            size="sm"
            variant="secondary"
          >
            Developer Mode
          </Button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {!query.opportunityId && (
        <Card>
          <CardBody className="space-y-3 text-sm text-fg-muted">
            <p>
              Open this page from a report’s{" "}
              <span className="font-medium text-fg">How to fix → Code + AI</span>{" "}
              so we know which MoneyGap to prompt for.
            </p>
            <Button href="/dashboard/reports" size="sm">
              Go to reports
            </Button>
          </CardBody>
        </Card>
      )}

      {query.opportunityId && pending && !data && (
        <p className="text-sm text-fg-muted">Loading prompts…</p>
      )}

      {data && (
        <>
          <Card>
            <CardBody className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Code2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{data.opportunity.category}</Badge>
                    <Badge tone="neutral">{data.opportunity.moduleId}</Badge>
                    <Badge tone="accent">
                      OI {data.opportunity.opportunityIndex}
                    </Badge>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-fg">
                    {data.opportunity.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {data.opportunity.summary ?? data.opportunity.whatsMissing}
                  </p>
                  <p className="mt-3 text-xs text-fg-subtle">
                    Difficulty: {data.opportunity.difficulty}
                    {data.opportunity.estimatedTime
                      ? ` · Est. time: ${data.opportunity.estimatedTime}`
                      : ""}
                    {data.stackSummary
                      ? ` · Stack: ${data.stackSummary}`
                      : " · Project Memory optional"}
                  </p>
                  {data.opportunity.estimatedAnnualRevenue != null &&
                  data.opportunity.estimatedAnnualRevenue > 0 ? (
                    <p className="mt-3 inline-flex flex-wrap items-center gap-2 font-display text-lg font-semibold tabular-nums text-gap">
                      {formatCurrency(data.opportunity.estimatedAnnualRevenue)}
                      <EstimateBadge />
                      <span className="text-xs font-normal text-fg-subtle">
                        annual · not a guarantee
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-5">
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                    What’s missing
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg">
                    {data.opportunity.whatsMissing}
                  </p>
                </section>
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                    Why it matters
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {data.opportunity.whyItMatters}
                  </p>
                </section>
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                    Business impact
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {data.opportunity.businessImpact}
                  </p>
                </section>
              </div>

              {data.opportunity.fixes && data.opportunity.fixes.length > 0 ? (
                <details className="group rounded-xl border border-border">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-fg marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-2">
                      Fix Plan
                      <span className="text-fg-subtle transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-border px-4 py-4">
                    <FixPlan fixes={data.opportunity.fixes} />
                  </div>
                </details>
              ) : null}
            </CardBody>
          </Card>

          <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <Card>
              <CardHeader className="pb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  IDE / tool
                </h3>
              </CardHeader>
              <CardBody className="space-y-1 pt-0">
                {data.prompts.map((p) => (
                  <button
                    key={p.tool}
                    type="button"
                    onClick={() => setTool(p.tool)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      (active?.tool ?? tool) === p.tool
                        ? "bg-accent-soft/70 font-medium text-fg"
                        : "text-fg-muted hover:bg-bg-muted hover:text-fg"
                    }`}
                  >
                    {p.title.replace(/ prompt$/i, "").replace(/ brief$/i, "")}
                  </button>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-fg">
                    {active?.title ?? "Prompt"}
                  </h3>
                  <p className="mt-1 text-xs text-fg-muted">{active?.intro}</p>
                </div>
                <Button size="sm" disabled={!active} onClick={() => void copyPrompt()}>
                  {copied ? (
                    <>
                      <Check className="size-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy prompt
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardBody>
                <pre className="max-h-[min(60vh,560px)] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-bg px-4 py-3 font-mono text-xs leading-relaxed text-fg">
                  {active?.body}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    href={
                      opportunityId
                        ? `/dashboard/developer-mode?opportunityId=${encodeURIComponent(opportunityId)}`
                        : "/dashboard/developer-mode"
                    }
                    size="sm"
                    variant="secondary"
                  >
                    Continue in Developer Mode
                  </Button>
                  {!data.hasStack && (
                    <Button href="/dashboard/integrations" size="sm" variant="ghost">
                      Connect GitHub (Hub)
                    </Button>
                  )}
                  {reportId && (
                    <Link
                      href={`/reports/${reportId}`}
                      className="inline-flex items-center text-xs font-medium text-accent underline-offset-2 hover:underline"
                    >
                      Return to report
                    </Link>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
