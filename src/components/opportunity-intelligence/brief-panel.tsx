"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type BriefPayload = {
  suggestedTitle?: string;
  description?: string;
  targetAudience?: string;
  primaryIntent?: string;
  recommendedHeadings?: string[];
  suggestedFaqs?: string[];
  schemaRecommendations?: string[];
  callsToAction?: string[];
  successMetrics?: string[];
  implementationLinks?: { label: string; href: string }[];
};

export function BriefPanel({
  title,
  payload,
  onClose,
}: {
  title: string;
  payload: BriefPayload;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="font-display text-lg font-semibold">
            {payload.suggestedTitle ?? title}
          </h3>
          <p className="mt-1 text-xs text-fg-muted">Content Brief</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-fg-muted">
        {payload.description && <p>{payload.description}</p>}
        {payload.targetAudience && (
          <p>
            <span className="font-medium text-fg">Audience: </span>
            {payload.targetAudience}
          </p>
        )}
        {payload.primaryIntent && (
          <p>
            <span className="font-medium text-fg">Intent: </span>
            {payload.primaryIntent}
          </p>
        )}
        {payload.recommendedHeadings && (
          <div>
            <p className="font-medium text-fg">Headings</p>
            <ul className="mt-1 list-disc pl-4">
              {payload.recommendedHeadings.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.suggestedFaqs && (
          <div>
            <p className="font-medium text-fg">FAQs</p>
            <ul className="mt-1 list-disc pl-4">
              {payload.suggestedFaqs.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.schemaRecommendations && (
          <p>
            <span className="font-medium text-fg">Schema: </span>
            {payload.schemaRecommendations.join(", ")}
          </p>
        )}
        {payload.callsToAction && (
          <p>
            <span className="font-medium text-fg">CTAs: </span>
            {payload.callsToAction.join(" · ")}
          </p>
        )}
        {payload.successMetrics && (
          <p>
            <span className="font-medium text-fg">Success metrics: </span>
            {payload.successMetrics.join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(payload.implementationLinks ?? []).map((l) => (
            <Button key={l.href} href={l.href} size="sm" variant="secondary">
              {l.label}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
