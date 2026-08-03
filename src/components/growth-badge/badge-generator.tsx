"use client";

import { Button } from "@/components/ui/button";

type StyleOption = {
  id: string;
  label: string;
  shortLabel: string;
};

export function BadgeGenerator({
  websites,
  styles,
  websiteId,
  style,
  pending,
  onWebsiteChange,
  onStyleChange,
  onCreate,
}: {
  websites: { id: string; name: string; domain: string }[];
  styles: StyleOption[];
  websiteId: string;
  style: string;
  pending: boolean;
  onWebsiteChange: (id: string) => void;
  onStyleChange: (id: string) => void;
  onCreate: () => void;
}) {
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
        <div className="mt-2 space-y-2">
          {styles.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm transition hover:border-border-strong"
            >
              <input
                type="radio"
                name="badge-style"
                className="mt-1"
                checked={style === s.id}
                onChange={() => onStyleChange(s.id)}
              />
              <span className="font-medium text-fg">{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
