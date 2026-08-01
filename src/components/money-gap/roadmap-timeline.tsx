import type { GrowthRoadmapItem } from "@/db/schema";
import { cn } from "@/lib/utils";

type RoadmapBuckets = {
  today: GrowthRoadmapItem[];
  thisWeek: GrowthRoadmapItem[];
  thisMonth: GrowthRoadmapItem[];
  nextQuarter: GrowthRoadmapItem[];
};

const BUCKETS: { key: keyof RoadmapBuckets; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "nextQuarter", label: "Next Quarter" },
];

export function RoadmapTimeline({
  roadmap,
  className,
}: {
  roadmap: RoadmapBuckets;
  className?: string;
}) {
  const hasItems = BUCKETS.some((b) => (roadmap[b.key] ?? []).length > 0);
  if (!hasItems) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {BUCKETS.map(({ key, label }) => {
        const items = roadmap[key] ?? [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
              {label}
            </p>
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li
                  key={`${key}-${i}-${item.title}`}
                  className="rounded-xl border border-border bg-bg px-4 py-3"
                >
                  <p className="text-sm font-medium text-fg">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {item.action}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-fg-subtle">
                    <span>Difficulty: {item.difficulty}</span>
                    <span>·</span>
                    <span>Outcome: {item.expectedOutcome}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
