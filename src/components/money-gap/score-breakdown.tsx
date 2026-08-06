"use client";

import { useState } from "react";
import type { CategoryScores } from "@/db/schema";
import {
  GOLDEN_CATEGORIES,
  rollupCategoryScores,
} from "@/lib/moneygap/categories";
import {
  buildCategoryNarratives,
  type CategoryNarrative,
} from "@/lib/moneygap/score-narratives";
import { cn } from "@/lib/utils";

const MODULE_LABELS: { key: keyof CategoryScores; label: string }[] = [
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

type OppLite = {
  title: string;
  moduleId?: string | null;
  whatsMissing?: string | null;
  summary?: string | null;
};

export function ScoreBreakdown({
  scores,
  opportunities = [],
  className,
}: {
  scores: CategoryScores;
  opportunities?: OppLite[];
  className?: string;
}) {
  const [showModules, setShowModules] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const golden = rollupCategoryScores(scores);
  const narratives = buildCategoryNarratives(scores, opportunities);
  const byId = Object.fromEntries(
    narratives.map((n) => [n.categoryId, n]),
  ) as Record<string, CategoryNarrative>;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-subtle">
          {showModules
            ? "All engine modules"
            : "MoneyGap Categories™ (7) — tap a score for current state, weaknesses, and improvements"}
        </p>
        <button
          type="button"
          onClick={() => setShowModules((v) => !v)}
          className="text-xs font-medium text-accent hover:underline"
        >
          {showModules ? "Show 7 categories" : "All modules"}
        </button>
      </div>

      {showModules ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULE_LABELS.map(({ key, label }) => {
            const value = Math.max(0, Math.min(100, scores[key] ?? 0));
            return <ScoreBar key={key} label={label} value={value} />;
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {GOLDEN_CATEGORIES.map((cat) => {
            const narrative = byId[cat.id];
            const isOpen = expanded === cat.id;
            return (
              <div key={cat.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((cur) => (cur === cat.id ? null : cat.id))
                  }
                  className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={isOpen}
                >
                  <ScoreBar
                    label={cat.shortLabel}
                    value={golden[cat.id]}
                    interactive
                  />
                </button>
                {isOpen && narrative ? (
                  <div className="space-y-2 rounded-xl border border-border bg-bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
                    <p>
                      <span className="font-semibold text-fg">Current: </span>
                      {narrative.currentState}
                    </p>
                    <p>
                      <span className="font-semibold text-fg">Weaknesses: </span>
                      {narrative.weaknesses}
                    </p>
                    <p>
                      <span className="font-semibold text-fg">
                        Improvements:{" "}
                      </span>
                      {narrative.improvements}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  interactive,
}: {
  label: string;
  value: number;
  interactive?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium text-fg",
            interactive && "underline-offset-2 group-hover:underline",
          )}
        >
          {label}
          {interactive ? (
            <span className="ml-1 font-normal text-fg-subtle">details</span>
          ) : null}
        </span>
        <span className="tabular-nums text-fg-muted">{clamped}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-muted">
        <div
          className="h-full rounded-full bg-gap"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
