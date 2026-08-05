"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Rec = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  whyItMatters: string;
  businessImpact: string;
  seoImpact: string;
  aiReadinessImpact: string;
  difficulty: string;
  estimatedTime: string;
  opportunityScore: number;
  nextSteps: string[] | null;
  implementationLinks: { label: string; href: string }[] | null;
  briefId: string | null;
  moneyGapOpportunityId: string | null;
};

export function RecommendationCard({
  rec,
  onOpenBrief,
}: {
  rec: Rec;
  onOpenBrief?: (briefId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="font-display text-base font-semibold">{rec.title}</h3>
          <p className="mt-1 text-xs text-fg-subtle">{rec.kind.replace(/_/g, " ")}</p>
        </div>
        <Badge tone="accent">Score {rec.opportunityScore}</Badge>
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-fg-muted">
        <p>{rec.summary}</p>
        <p>
          <span className="font-medium text-fg">Why it matters: </span>
          {rec.whyItMatters}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="neutral">Business {rec.businessImpact}</Badge>
          <Badge tone="neutral">SEO {rec.seoImpact}</Badge>
          <Badge tone="neutral">AI {rec.aiReadinessImpact}</Badge>
          <Badge tone="neutral">
            {rec.difficulty} · {rec.estimatedTime}
          </Badge>
        </div>
        {rec.nextSteps && rec.nextSteps.length > 0 && (
          <ol className="list-decimal space-y-1 pl-4 text-xs">
            {rec.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-2">
          {rec.briefId && onOpenBrief && (
            <Button type="button" size="sm" onClick={() => onOpenBrief(rec.briefId!)}>
              Open content brief
            </Button>
          )}
          {rec.moneyGapOpportunityId && (
            <Button
              href={`/dashboard/money-gaps?opportunity=${rec.moneyGapOpportunityId}`}
              size="sm"
              variant="secondary"
            >
              Open in Money Gaps / FixFlow
            </Button>
          )}
          {(rec.implementationLinks ?? []).slice(0, 2).map((l) => (
            <Button key={l.href} href={l.href} size="sm" variant="ghost">
              {l.label}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
