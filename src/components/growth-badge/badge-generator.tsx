"use client";

import { Button } from "@/components/ui/button";
import { badgeSvgDataUri } from "@/lib/growth-badge/svg";
import type { GrowthBadgeStyle } from "@/db/schema";
import { cn } from "@/lib/utils";

type StyleOption = {
  id: string;
  label: string;
  shortLabel: string;
  hint?: string;
};

export function BadgeGenerator({
  websites,
  styles,
  websiteId,
  style,
  pending,
  sampleScore = 73,
  onWebsiteChange,
  onStyleChange,
  onCreate,
}: {
  websites: { id: string; name: string; domain: string }[];
  styles: StyleOption[];
  websiteId: string;
  style: string;
  pending: boolean;
  sampleScore?: number;
  onWebsiteChange: (id: string) => void;
  onStyleChange: (id: string) => void;
  onCreate: () => void;
}) {
  const draftPreview = badgeSvgDataUri({
    style: (style || "growth_optimized") as GrowthBadgeStyle,
    score: sampleScore,
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
          Website
        </label>
        <select
          className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg"
          value={websiteId}
          onChange={(e) => onWebsiteChange(e.target.value)}
        >
          <option value="">Select a website</option>
          {websites.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.domain})
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
          Badge style
        </legend>
        <p className="mt-1 text-xs text-fg-muted">
          Each style shows different copy and accent color on the badge.
        </p>
        <div className="mt-3 space-y-3">
          {styles.map((s) => {
            const selected = style === s.id;
            const preview = badgeSvgDataUri({
              style: s.id as GrowthBadgeStyle,
              score: sampleScore,
            });
            return (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-2.5 rounded-xl border px-3 py-3 text-sm transition",
                  selected
                    ? "border-accent bg-accent-soft/30"
                    : "border-border hover:border-border-strong",
                )}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="badge-style"
                    className="mt-1"
                    checked={selected}
                    onChange={() => onStyleChange(s.id)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-fg">{s.label}</span>
                    {s.hint ? (
                      <span className="mt-0.5 block text-xs text-fg-muted">
                        {s.hint}
                      </span>
                    ) : null}
                  </span>
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Preview: ${s.shortLabel}`}
                  width={280}
                  height={64}
                  className="w-full max-w-[280px] rounded-lg border border-border/80 bg-bg"
                />
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-xl border border-dashed border-border bg-bg-muted/30 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
          Selected draft
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draftPreview}
          alt="Selected badge style draft"
          width={280}
          height={64}
          className="mt-2 rounded-lg border border-border bg-bg"
        />
      </div>

      <Button
        type="button"
        disabled={pending || !websiteId || !style}
        onClick={onCreate}
      >
        {pending ? "Creating…" : "Create Growth Badge"}
      </Button>
    </div>
  );
}
