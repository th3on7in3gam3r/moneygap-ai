import type { CategoryScores } from "@/db/schema";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: { key: keyof CategoryScores; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "authority", label: "Authority" },
  { key: "seo", label: "SEO" },
  { key: "content", label: "Content" },
  { key: "trust", label: "Trust" },
  { key: "conversion", label: "Conversion" },
  { key: "marketing", label: "Marketing" },
  { key: "automation", label: "Automation" },
  { key: "customer", label: "Customer" },
  { key: "ai", label: "AI" },
  { key: "competitive", label: "Competitive" },
];

export function ScoreBreakdown({
  scores,
  className,
}: {
  scores: CategoryScores;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {CATEGORY_LABELS.map(({ key, label }) => {
        const value = Math.max(0, Math.min(100, scores[key] ?? 0));
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-fg-muted">{label}</span>
              <span className="font-semibold tabular-nums text-fg">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
