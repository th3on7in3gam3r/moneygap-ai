"use client";

import { useSyncExternalStore } from "react";
import { ArrowLeft } from "lucide-react";
import { IdePromptPanel } from "@/components/developer/ide-prompt-panel";
import { Button } from "@/components/ui/button";

function getSearchSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function parseQuery(search: string): {
  opportunityId: string | null;
  reportId: string | null;
} {
  const q = new URLSearchParams(search);
  return {
    opportunityId: q.get("opportunityId")?.trim() || null,
    reportId: q.get("reportId")?.trim() || null,
  };
}

export default function IdePromptPage() {
  // Snapshot must be a stable primitive — object snapshots from getSnapshot
  // cause Maximum update depth exceeded.
  const search = useSyncExternalStore(
    () => () => {},
    getSearchSnapshot,
    () => "",
  );
  const query = parseQuery(search);

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Code + AI · Fix Path
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            IDE Prompt
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            Copy a ready-made prompt for Cursor, Claude, or your IDE of choice.
            Review before applying — never auto-publishes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {query.reportId && (
            <Button href={`/reports/${query.reportId}`} size="sm" variant="secondary">
              <ArrowLeft className="size-3.5 opacity-70" />
              Back to report
            </Button>
          )}
          <Button
            href={
              query.opportunityId
                ? `/dashboard/developer-mode?opportunityId=${encodeURIComponent(query.opportunityId)}`
                : "/dashboard/developer-mode"
            }
            size="sm"
            variant="secondary"
          >
            Developer Mode
          </Button>
        </div>
      </header>

      <IdePromptPanel
        opportunityId={query.opportunityId}
        reportId={query.reportId}
      />
    </div>
  );
}
