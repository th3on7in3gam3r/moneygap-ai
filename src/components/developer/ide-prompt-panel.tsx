"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import type { OpportunityFix } from "@/db/schema";
import {
  EstimateBadge,
  FixPlan,
} from "@/components/money-gap/opportunity-card";
import { FixflowProposalPanel } from "@/components/fixflow/fixflow-proposal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export type IdePromptItem = {
  tool: string;
  title: string;
  intro: string;
  body: string;
};

export type IdePromptOpportunity = {
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

export type IdePromptWebsite = {
  id: string;
  name: string;
  domain: string;
  url: string;
};

export type IdePromptPayload = {
  opportunity: IdePromptOpportunity;
  website: IdePromptWebsite | null;
  prompts: IdePromptItem[];
  stackSummary: string | null;
  hasStack: boolean;
};

/**
 * Shared IDE Prompt body for the full page and How to Fix drawer.
 */
export function IdePromptPanel({
  opportunityId,
  reportId: reportIdProp,
  compact = false,
  showEmptyHint = true,
}: {
  opportunityId: string | null;
  reportId?: string | null;
  /** Tighter layout for drawers */
  compact?: boolean;
  showEmptyHint?: boolean;
}) {
  const [data, setData] = useState<IdePromptPayload | null>(null);
  const [tool, setTool] = useState<string>("cursor");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!opportunityId) {
      setData(null);
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void (async () => {
        const res = await fetch(
          `/api/developer-mode/ide-prompt?opportunityId=${encodeURIComponent(opportunityId)}`,
        );
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? "Could not load IDE prompts");
          setData(null);
          return;
        }
        const body = (await res.json()) as IdePromptPayload;
        setData(body);
        setTool(body.prompts[0]?.tool ?? "cursor");
        setError(null);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const active = data?.prompts.find((p) => p.tool === tool) ?? data?.prompts[0];
  const reportId = data?.opportunity.reportId ?? reportIdProp ?? null;
  const resolvedOpportunityId = data?.opportunity.id ?? opportunityId;

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
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {!opportunityId && showEmptyHint && (
        <Card>
          <CardBody className="space-y-3 text-sm text-fg-muted">
            <p>
              Open from a report’s{" "}
              <span className="font-medium text-fg">How to fix → Code + AI</span>{" "}
              so we know which MoneyGap to prompt for.
            </p>
            <Button href="/dashboard/reports" size="sm">
              Go to reports
            </Button>
          </CardBody>
        </Card>
      )}

      {opportunityId && pending && !data && (
        <p className="text-sm text-fg-muted">Loading prompts…</p>
      )}

      {data && (
        <>
          <Card>
            <CardBody className={compact ? "space-y-4" : "space-y-5"}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Code2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {data.website ? (
                      <Badge tone="accent" className="normal-case tracking-normal">
                        {data.website.domain}
                      </Badge>
                    ) : null}
                    <Badge tone="neutral">{data.opportunity.category}</Badge>
                    <Badge tone="neutral">{data.opportunity.moduleId}</Badge>
                    <Badge tone="accent">
                      OI {data.opportunity.opportunityIndex}
                    </Badge>
                  </div>
                  <h2
                    className={`mt-2 font-display font-semibold tracking-tight text-fg ${
                      compact ? "text-lg" : "text-xl"
                    }`}
                  >
                    {data.opportunity.title}
                  </h2>
                  {data.website ? (
                    <p className="mt-1 text-sm text-fg-muted">
                      For{" "}
                      <a
                        href={data.website.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-accent hover:underline"
                      >
                        {data.website.url}
                      </a>
                    </p>
                  ) : null}
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
                        annual · AI Estimate · not a guarantee
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

          <FixflowProposalPanel opportunityId={data.opportunity.id} />

          <div
            className={
              compact
                ? "grid items-start gap-4"
                : "grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"
            }
          >
            <Card>
              <CardHeader className="pb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  IDE / tool
                </h3>
              </CardHeader>
              <CardBody
                className={`space-y-1 pt-0 ${compact ? "flex flex-wrap gap-1 space-y-0" : ""}`}
              >
                {data.prompts.map((p) => (
                  <button
                    key={p.tool}
                    type="button"
                    onClick={() => setTool(p.tool)}
                    className={`rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      compact ? "shrink-0" : "w-full"
                    } ${
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
                <pre
                  className={`overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-bg px-4 py-3 font-mono text-xs leading-relaxed text-fg ${
                    compact
                      ? "max-h-[min(45vh,420px)]"
                      : "max-h-[min(60vh,560px)]"
                  }`}
                >
                  {active?.body}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    href={
                      resolvedOpportunityId
                        ? `/dashboard/developer-mode?opportunityId=${encodeURIComponent(resolvedOpportunityId)}`
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
                  {reportId && !compact && (
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
