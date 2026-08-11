"use client";

import { useMemo, useState } from "react";
import type { OpportunityCardData } from "@/components/money-gap/opportunity-card";
import { OpportunityActionCenter } from "@/components/action-center/opportunity-action-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { checklistForPlaybook } from "@/lib/advisor/checklists";
import { resolvePlaybook } from "@/lib/advisor/playbooks";
import { formatCurrency } from "@/lib/utils";

export function ExecutionModePanel({
  reportId,
  opportunity,
  website,
  onExit,
  onAskAdvisor,
}: {
  reportId: string;
  opportunity: OpportunityCardData;
  website: { name: string; domain: string; url: string };
  onExit: () => void;
  onAskAdvisor?: (opportunityId: string) => void;
}) {
  const playbook = useMemo(
    () =>
      resolvePlaybook({
        moduleId: opportunity.moduleId,
        title: opportunity.title,
        category: opportunity.category,
        whatsMissing: opportunity.whatsMissing,
      }),
    [opportunity],
  );
  const checklist = useMemo(() => checklistForPlaybook(playbook), [playbook]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const done = Object.values(checked).filter(Boolean).length;
  const progress = checklist.length
    ? Math.round((done / checklist.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              Execution Mode
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="accent">{website.domain}</Badge>
              <a
                href={website.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-xs text-accent hover:underline"
              >
                {website.url}
              </a>
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">
              {opportunity.title}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Fix for <span className="font-medium text-fg">{website.name}</span>
              {" · "}
              {opportunity.summary ?? opportunity.whatsMissing}
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onExit}>
            Exit focus
          </Button>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Current focus</h2>
            <Badge tone="accent">{progress}%</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {opportunity.estimatedAnnualRevenue != null &&
              opportunity.estimatedAnnualRevenue > 0 && (
                <p className="font-display text-xl font-semibold tabular-nums text-gap">
                  {formatCurrency(opportunity.estimatedAnnualRevenue)}{" "}
                  <span className="text-xs font-sans font-normal text-fg-muted">
                    est. annual opportunity
                  </span>
                </p>
              )}
            <p className="text-sm leading-relaxed text-fg">
              {opportunity.businessReasoning ??
                opportunity.whyItMatters ??
                opportunity.businessImpact}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">AI guidance</h2>
            <Badge tone="neutral">{playbook}</Badge>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            <p>
              Work this opportunity end-to-end for{" "}
              <span className="font-medium text-fg">{website.domain}</span>: use
              the Action Center below to generate assets, create a project, and
              mark progress. Stay in Execution Mode until the checklist is done.
            </p>
            {opportunity.detectionSource && (
              <p className="text-xs text-fg-subtle">Source: {opportunity.detectionSource}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Checklist</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {checklist.map((item, i) => (
              <label
                key={`${item}-${i}`}
                className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(checked[i])}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [i]: e.target.checked }))
                  }
                />
                <span className={checked[i] ? "text-fg-muted line-through" : "text-fg"}>
                  {item}
                </span>
              </label>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Action Center</h2>
          </CardHeader>
          <CardBody>
            <OpportunityActionCenter
              reportId={reportId}
              opportunity={opportunity}
              onAskAdvisor={(id) => {
                onAskAdvisor?.(id);
                onExit();
              }}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
