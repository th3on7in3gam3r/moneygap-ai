"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AssetSection } from "@/db/schema";
import { IdePromptPanel } from "@/components/developer/ide-prompt-panel";
import { Button } from "@/components/ui/button";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { cn } from "@/lib/utils";

/** Portal to body so drawers aren't trapped by Execution Mode's backdrop-filter scroll container. */
function DrawerPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

const DRAWER_OVERLAY =
  "fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm";
const DRAWER_PANEL =
  "flex h-full w-full max-w-xl flex-col border-l border-border bg-bg-elevated shadow-2xl";


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
    <DrawerPortal>
    <div className={DRAWER_OVERLAY}>
      <div className={cn(DRAWER_PANEL, "max-w-xl")}>
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
    </DrawerPortal>
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
    <DrawerPortal>
    <div className={DRAWER_OVERLAY}>
      <div className={cn(DRAWER_PANEL, "max-w-md")}>
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
    </DrawerPortal>
  );
}

export function IdePromptDrawer({
  open,
  opportunityId,
  reportId,
  onClose,
}: {
  open: boolean;
  opportunityId: string;
  reportId: string;
  onClose: () => void;
}) {
  if (!open) return null;

  const fullHref = `/dashboard/ide-prompt?opportunityId=${encodeURIComponent(opportunityId)}&reportId=${encodeURIComponent(reportId)}`;

  return (
    <DrawerPortal>
    <div className={DRAWER_OVERLAY}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ide-prompt-drawer-title"
        className={cn(DRAWER_PANEL, "max-w-2xl")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              How to fix · Code + AI
            </p>
            <h3
              id="ide-prompt-drawer-title"
              className="mt-1 font-display text-lg font-semibold text-fg"
            >
              IDE Prompt
            </h3>
            <p className="mt-1 text-xs text-fg-subtle">
              Copy into Cursor / Claude — review before applying. Never auto-publishes.
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
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <IdePromptPanel
            opportunityId={opportunityId}
            reportId={reportId}
            compact
            showEmptyHint={false}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button href={fullHref} size="sm" variant="ghost">
            Open full page
          </Button>
        </div>
      </div>
    </div>
    </DrawerPortal>
  );
}

export function AutomationFixDrawer({
  open,
  opportunityId,
  opportunityTitle,
  onClose,
}: {
  open: boolean;
  opportunityId: string;
  opportunityTitle: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const studioHref = `/dashboard/automation?opportunityId=${encodeURIComponent(opportunityId)}`;

  async function generateDraft() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Could not create draft workflow.");
        return;
      }
      setMessage(
        "Draft workflow created — open Automation Studio to review. Never auto-publishes.",
      );
    } catch {
      setMessage("Could not create draft workflow.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DrawerPortal>
    <div className={DRAWER_OVERLAY}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-fix-drawer-title"
        className={cn(DRAWER_PANEL, "max-w-md")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              How to fix · Automation
            </p>
            <h3
              id="automation-fix-drawer-title"
              className="mt-1 font-display text-lg font-semibold text-fg"
            >
              Draft workflow
            </h3>
            <p className="mt-1 text-xs text-fg-subtle">
              Creates an Action Project draft only — never auto-publishes.
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
          <p className="text-sm font-medium text-fg">{opportunityTitle}</p>
          <p className="text-sm leading-relaxed text-fg-muted">
            Generate a draft automation workflow scoped to this MoneyGap, then
            review it in Automation Studio™ before anything runs.
          </p>
          {message && (
            <p className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg-muted">
              {message}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void generateDraft()}
          >
            {busy ? "Generating…" : "Generate draft workflow"}
          </Button>
          <Button href={studioHref} size="sm" variant="secondary">
            Open Automation Studio
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
    </DrawerPortal>
  );
}

export function IntegrationsFixDrawer({
  open,
  opportunityTitle,
  onClose,
}: {
  open: boolean;
  opportunityTitle: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <DrawerPortal>
    <div className={DRAWER_OVERLAY}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="integrations-fix-drawer-title"
        className={cn(DRAWER_PANEL, "max-w-md")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              How to fix · Integrations
            </p>
            <h3
              id="integrations-fix-drawer-title"
              className="mt-1 font-display text-lg font-semibold text-fg"
            >
              Connect tools
            </h3>
            <p className="mt-1 text-xs text-fg-subtle">
              OAuth and credentials stay in Integration Hub™ for security.
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
          <p className="text-sm font-medium text-fg">{opportunityTitle}</p>
          <p className="text-sm leading-relaxed text-fg-muted">
            Connect CRM, email, analytics, or GitHub so Fix Paths and drafts can
            use live data. Nothing publishes automatically from the Hub.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          <Button href="/dashboard/integrations" size="sm">
            Open Integration Hub
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Stay on report
          </Button>
        </div>
      </div>
    </div>
    </DrawerPortal>
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
