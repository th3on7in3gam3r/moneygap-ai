"use client";

import { Button } from "@/components/ui/button";

export function JourneyCard({
  beforeScore,
  afterScore,
  improvementPoints,
  pending,
  onRefresh,
}: {
  beforeScore: number | null;
  afterScore: number | null;
  improvementPoints: number | null;
  pending: boolean;
  onRefresh: () => void;
}) {
  const growth =
    improvementPoints == null
      ? "—"
      : improvementPoints >= 0
        ? `+${improvementPoints} points`
        : `${improvementPoints} points`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
          Growth Journey
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Observed MoneyGap Score™ before / after from snapshots or reports.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            Before
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">
            {beforeScore ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            After
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">
            {afterScore ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            Growth
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-accent">
            {growth}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={onRefresh}
      >
        Refresh journey
      </Button>
    </div>
  );
}
