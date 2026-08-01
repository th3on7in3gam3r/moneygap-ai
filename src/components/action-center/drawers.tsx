"use client";

import { useState } from "react";
import type { AssetSection } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { cn } from "@/lib/utils";

export function AssetDrawer({
  open,
  title,
  sections,
  assetId,
  reportId,
  loading,
  message,
  upgrade,
  onClose,
  onSectionsChange,
  onSave,
}: {
  open: boolean;
  title: string;
  sections: AssetSection[];
  assetId: string | null;
  reportId: string;
  loading?: boolean;
  message?: string | null;
  upgrade?: UpgradePayload | null;
  onClose: () => void;
  onSectionsChange: (sections: AssetSection[]) => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-bg-elevated shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              Build This For Me · Draft
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-fg">{title}</h3>
            <p className="mt-1 text-xs text-fg-subtle">
              Review and edit before saving. Nothing is published automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-fg-muted hover:bg-bg-muted"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {upgrade && !loading && <UpgradePrompt payload={upgrade} />}
          {loading && (
            <p className="text-sm text-fg-muted">Generating implementation pack…</p>
          )}
          {!loading &&
            sections.map((section, index) => (
              <div key={section.id} className="space-y-2">
                <input
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-fg"
                  value={section.heading}
                  onChange={(e) => {
                    const next = [...sections];
                    next[index] = { ...section, heading: e.target.value };
                    onSectionsChange(next);
                  }}
                />
                <textarea
                  className="min-h-32 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-fg-muted"
                  value={section.body}
                  onChange={(e) => {
                    const next = [...sections];
                    next[index] = { ...section, body: e.target.value };
                    onSectionsChange(next);
                  }}
                />
              </div>
            ))}
          {message && <p className="text-xs text-fg-muted">{message}</p>}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            size="sm"
            disabled={!assetId || loading}
            onClick={onSave}
          >
            Save draft
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Done
          </Button>
          <span className="ml-auto self-center text-[10px] text-fg-subtle">
            {reportId.slice(0, 8)}…
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChecklistDrawer({
  open,
  title,
  items,
  onClose,
  onCreateProject,
  creating,
}: {
  open: boolean;
  title: string;
  items: string[];
  onClose: () => void;
  onCreateProject: () => void;
  creating?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-bg-elevated shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              Implementation checklist
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-fg">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-fg-muted hover:bg-bg-muted"
          >
            Close
          </button>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg-muted"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" size="sm" disabled={creating} onClick={onCreateProject}>
            {creating ? "Creating…" : "Create Project with checklist"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ActionCenterBar({
  buttons,
  labels,
  disabled,
  onAction,
  status,
  className,
}: {
  buttons: string[];
  labels: Record<string, string>;
  disabled?: boolean;
  onAction: (id: string) => void;
  status?: string | null;
  className?: string;
}) {
  const primary = buttons.filter((id) =>
    ["build", "campaign", "outreach", "testimonial_request"].includes(id),
  );
  const track = buttons.filter((id) =>
    ["save", "complete", "create_project", "checklist"].includes(id),
  );
  const learn = buttons.filter((id) =>
    ["learn_why", "ask_advisor"].includes(id),
  );
  const rest = buttons.filter(
    (id) => !primary.includes(id) && !track.includes(id) && !learn.includes(id),
  );

  const groups: { label: string; ids: string[] }[] = [
    { label: "Build", ids: [...primary, ...rest] },
    { label: "Track", ids: track },
    { label: "Learn", ids: learn },
  ].filter((g) => g.ids.length > 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
          Action Center™
        </p>
        {status && (
          <span className="rounded-md bg-bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
            {status.replace("_", " ")}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.ids.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={
                    id === "build" || id === "campaign" ? "primary" : "secondary"
                  }
                  disabled={disabled}
                  onClick={() => onAction(id)}
                  className="h-8 px-3 text-xs"
                >
                  {labels[id] ?? id}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useActionBusy() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return { busy, setBusy, message, setMessage };
}
