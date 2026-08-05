"use client";

import { Badge } from "@/components/ui/badge";

type Item = {
  id: string;
  title: string;
  action: string;
  businessImpact: string;
  seoImpact: string;
  aiReadinessImpact: string;
  difficulty: string;
  estimatedTime: string;
  opportunityScore: number;
};

export function RoadmapList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Content Roadmap™ fills in after Opportunity Intelligence™ runs on a scan.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-3 py-3"
        >
          <div>
            <p className="font-medium text-fg">{item.title}</p>
            <p className="mt-1 text-xs text-fg-muted">{item.action}</p>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
              <Badge tone="neutral">Business {item.businessImpact}</Badge>
              <Badge tone="neutral">SEO {item.seoImpact}</Badge>
              <Badge tone="neutral">AI {item.aiReadinessImpact}</Badge>
              <Badge tone="neutral">
                {item.difficulty} · {item.estimatedTime}
              </Badge>
            </div>
          </div>
          <Badge tone="accent">{item.opportunityScore}</Badge>
        </li>
      ))}
    </ul>
  );
}
