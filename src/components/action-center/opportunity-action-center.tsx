"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AssetSection } from "@/db/schema";
import {
  ActionCenterBar,
  AssetDrawer,
  ChecklistDrawer,
} from "@/components/action-center/drawers";
import { checklistForPlaybook } from "@/lib/advisor/checklists";
import {
  BUTTON_LABELS,
  buttonsForPlaybook,
  resolvePlaybook,
  type PlaybookId,
} from "@/lib/advisor/playbooks";
import {
  UpgradePrompt,
  type UpgradePayload,
} from "@/components/billing/upgrade-prompt";
import { recommendFixPaths, type FixPathId } from "@/lib/fix-paths";
import { useRouter } from "next/navigation";
import { OpportunityCollabPanel } from "@/components/team/opportunity-collab-panel";

export function OpportunityActionCenter({
  reportId,
  opportunity,
  onAskAdvisor,
  onStatusChange,
}: {
  reportId: string;
  opportunity: {
    id: string;
    title: string;
    category: string;
    moduleId?: string | null;
    whatsMissing: string;
    difficulty?: string | null;
    implementationStatus?: string | null;
  };
  onAskAdvisor?: (opportunityId: string) => void;
  onStatusChange?: (status: string, followUp?: string | null) => void;
}) {
  const router = useRouter();
  const playbook = useMemo(
    () =>
      resolvePlaybook({
        moduleId: opportunity.moduleId,
        title: opportunity.title,
        category: opportunity.category,
        whatsMissing: opportunity.whatsMissing,
      }),
    [opportunity],
  );

  const fixPaths = useMemo(
    () =>
      recommendFixPaths({
        id: opportunity.id,
        title: opportunity.title,
        category: opportunity.category,
        moduleId: opportunity.moduleId,
        whatsMissing: opportunity.whatsMissing,
        difficulty: opportunity.difficulty,
      }),
    [opportunity],
  );

  const buttons = buttonsForPlaybook(playbook);
  const [status, setStatus] = useState(opportunity.implementationStatus ?? "open");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [assetOpen, setAssetOpen] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetTitle, setAssetTitle] = useState("");
  const [sections, setSections] = useState<AssetSection[]>([]);
  const [assetMsg, setAssetMsg] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradePayload | null>(null);

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  async function patchStatus(implementationStatus: string) {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(
        `/api/reports/${reportId}/opportunities/${opportunity.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ implementationStatus }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        followUp?: string | null;
      };
      if (!res.ok) {
        setToast(data.error ?? "Could not update status");
        return;
      }
      setStatus(implementationStatus);
      onStatusChange?.(implementationStatus, data.followUp);
      setToast(
        data.followUp
          ? data.followUp
          : implementationStatus === "saved"
            ? "Saved for later."
            : implementationStatus === "completed"
              ? "Marked complete."
              : "Updated.",
      );
    } catch {
      setToast("Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function createProject() {
    setCreatingProject(true);
    setToast(null);
    setUpgrade(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          playbook,
        }),
      });
      const data = (await res.json()) as UpgradePayload & { error?: string };
      if (!res.ok) {
        if (res.status === 403 || data.code === "upgrade_required") {
          setUpgrade(data);
          setToast(null);
        } else {
          setToast(data.error ?? "Could not create project");
        }
        return;
      }
      setStatus("in_progress");
      setChecklistOpen(false);
      setToast("Project created — open the Action tab to track tasks.");
    } catch {
      setToast("Could not create project");
    } finally {
      setCreatingProject(false);
    }
  }

  async function generate(playbookOverride?: PlaybookId) {
    setAssetOpen(true);
    setAssetLoading(true);
    setAssetMsg(null);
    setUpgrade(null);
    setSections([]);
    setAssetId(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          playbook: playbookOverride ?? playbook,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        suggestedPlan?: string;
        message?: string;
        asset?: {
          id: string;
          title: string;
          content: AssetSection[];
        };
      };
      if (!res.ok || !data.asset) {
        if (res.status === 403 || data.code === "upgrade_required" || data.code === "usage_limit") {
          setUpgrade(data);
          setAssetMsg(null);
        } else {
          setUpgrade(null);
          setAssetMsg(data.error ?? "Generation failed");
        }
        return;
      }
      setUpgrade(null);
      setAssetId(data.asset.id);
      setAssetTitle(data.asset.title);
      setSections(data.asset.content ?? []);
    } catch {
      setAssetMsg("Generation failed");
    } finally {
      setAssetLoading(false);
    }
  }

  async function saveAsset() {
    if (!assetId) return;
    setAssetMsg(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: assetTitle,
          content: sections,
          status: "saved",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAssetMsg(data.error ?? "Save failed");
        return;
      }
      setAssetMsg("Draft saved. Nothing was published.");
    } catch {
      setAssetMsg("Save failed");
    }
  }

  async function onAction(id: string) {
    if (id === "learn_why") {
      setToast("Expand the card sections above to learn why this gap matters.");
      return;
    }
    if (id === "save") {
      await patchStatus("saved");
      return;
    }
    if (id === "complete") {
      await patchStatus("completed");
      return;
    }
    if (id === "create_project") {
      await createProject();
      return;
    }
    if (id === "checklist") {
      setChecklistOpen(true);
      return;
    }
    if (id === "ask_advisor") {
      onAskAdvisor?.(opportunity.id);
      setToast("Switch to the Advisor tab to continue this conversation.");
      return;
    }
    if (id === "build" || id === "campaign" || id === "outreach" || id === "testimonial_request") {
      const override: PlaybookId | undefined =
        id === "campaign" || id === "outreach"
          ? "backlinks"
          : id === "testimonial_request"
            ? "testimonials"
            : undefined;
      await generate(override);
      return;
    }
  }

  function onFixPath(pathId: FixPathId) {
    const def = fixPaths.paths.find((p) => p.id === pathId);
    if (!def) return;

    if (def.kind === "navigate" && def.href) {
      router.push(def.href({ opportunityId: opportunity.id, reportId }));
      return;
    }

    if (pathId === "action_assets") {
      void onAction("build");
      return;
    }
    if (pathId === "checklist") {
      void onAction("checklist");
      return;
    }
    if (pathId === "advisor") {
      void onAction("ask_advisor");
    }
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
          How to fix
        </p>
        <p className="text-xs text-fg-muted">{fixPaths.reason}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {fixPaths.paths.map((path) => {
            const recommended = path.id === fixPaths.recommendedId;
            return (
              <button
                key={path.id}
                type="button"
                disabled={busy || assetLoading}
                onClick={() => onFixPath(path.id)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  recommended
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-bg-muted"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-fg">{path.title}</span>
                  {recommended && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
                      Best fit
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  {path.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <OpportunityCollabPanel
        reportId={reportId}
        opportunityId={opportunity.id}
      />

      <ActionCenterBar
        buttons={buttons}
        labels={BUTTON_LABELS}
        disabled={busy || assetLoading}
        onAction={onAction}
        status={status}
      />
      <p className="text-xs text-fg-subtle">
        Prefer shortcuts? Use Action Center buttons above, or open{" "}
        <Link
          href={`/dashboard/ide-prompt?opportunityId=${encodeURIComponent(opportunity.id)}&reportId=${encodeURIComponent(reportId)}`}
          className="text-accent underline-offset-2 hover:underline"
        >
          IDE Prompt
        </Link>
        {" / "}
        <Link
          href={`/dashboard/developer-mode?opportunityId=${opportunity.id}`}
          className="text-accent underline-offset-2 hover:underline"
        >
          Developer Mode
        </Link>
        .
      </p>
      {toast && <p className="text-xs leading-relaxed text-fg-muted">{toast}</p>}
      {upgrade && <UpgradePrompt payload={upgrade} compact />}

      <AssetDrawer
        open={assetOpen}
        title={assetTitle || opportunity.title}
        sections={sections}
        assetId={assetId}
        reportId={reportId}
        loading={assetLoading}
        message={assetMsg}
        upgrade={upgrade}
        onClose={() => {
          setAssetOpen(false);
          setUpgrade(null);
        }}
        onSectionsChange={setSections}
        onSave={saveAsset}
      />

      <ChecklistDrawer
        open={checklistOpen}
        title={opportunity.title}
        items={checklistForPlaybook(playbook)}
        onClose={() => setChecklistOpen(false)}
        onCreateProject={createProject}
        creating={creatingProject}
      />
    </>
  );
}
