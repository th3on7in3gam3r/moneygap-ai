import type { GrowthRoadmapItem } from "@/db/schema";
import { cn } from "@/lib/utils";

type RoadmapBuckets = {
  today: GrowthRoadmapItem[];
  thisWeek: GrowthRoadmapItem[];
  thisMonth: GrowthRoadmapItem[];
  nextQuarter: GrowthRoadmapItem[];
};

/** Presentation weeks mapped from stored roadmap buckets (no data rewrite). */
const WEEK_GROUPS: {
  id: string;
  label: string;
  keys: (keyof RoadmapBuckets)[];
}[] = [
  { id: "week1", label: "Week 1", keys: ["today", "thisWeek"] },
  { id: "week2", label: "Week 2", keys: ["thisMonth"] },
  { id: "week3", label: "Week 3+", keys: ["nextQuarter"] },
];

export function RoadmapTimeline({
  roadmap,
  className,
}: {
  roadmap: RoadmapBuckets;
  className?: string;
}) {
  const groups = WEEK_GROUPS.map((g) => ({
    ...g,
    items: g.keys.flatMap((k) => roadmap[k] ?? []),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map(({ id, label, items }) => (
        <div key={id}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            {label}
          </p>
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li
                key={`${id}-${i}-${item.title}`}
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
      ))}
    </div>
  );
}
