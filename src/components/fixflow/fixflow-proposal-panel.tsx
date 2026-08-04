"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { DiffPreview, FixProposalRecord } from "@/lib/fixflow/types";

export function FixflowProposalPanel({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [proposal, setProposal] = useState<FixProposalRecord | null>(null);
  const [diffPreview, setDiffPreview] = useState<DiffPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    const res = await fetch(
      `/api/fixflow/proposals?opportunityId=${encodeURIComponent(opportunityId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const body = (await res.json()) as { proposals?: FixProposalRecord[] };
    const latest = body.proposals?.[0] ?? null;
    setProposal(latest);
    if (latest) {
      const detail = await fetch(`/api/fixflow/proposals/${latest.id}`, {
        cache: "no-store",
      });
      if (detail.ok) {
        const d = (await detail.json()) as { diffPreview?: DiffPreview | null };
        setDiffPreview(d.diffPreview ?? null);
      }
    }
  }, [opportunityId]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  async function generate() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/fixflow/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      });
      const body = (await res.json()) as {
        proposal?: FixProposalRecord;
        diffPreview?: DiffPreview;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not generate FixFlow proposal");
        return;
      }
      setProposal(body.proposal ?? null);
      setDiffPreview(body.diffPreview ?? null);
      setInfo("FixFlow™ draft proposal ready — review before approving.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(action: "approve" | "reject") {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fixflow/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as {
        proposal?: FixProposalRecord;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not update proposal");
        return;
      }
      setProposal(body.proposal ?? null);
      setInfo(
        action === "approve"
          ? "Approved. Continue in Developer Mode for an authorized draft PR (never auto-merges)."
          : "Proposal rejected.",
      );
    } finally {
      setBusy(false);
    }
  }

  const p = proposal?.proposal;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
            FixFlow™
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-fg">
            Fix proposal
          </h3>
          <p className="mt-1 max-w-xl text-xs text-fg-muted">
            Turn this MoneyGap into a reviewable implementation plan. Approval
            required before any branch or draft PR.
          </p>
        </div>
        <Button size="sm" disabled={busy} onClick={() => void generate()}>
          {proposal ? "Regenerate proposal" : "Generate FixFlow proposal"}
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {info ? <p className="text-sm text-fg-muted">{info}</p> : null}

        {!proposal || !p ? (
          <p className="text-sm text-fg-muted">
            No proposal yet. Generate one to see issue, impact, files, code
            example, and expected improvement.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">{proposal.status}</Badge>
              <Badge tone="neutral">{p.framework}</Badge>
              {p.moduleId ? <Badge tone="neutral">{p.moduleId}</Badge> : null}
            </div>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Issue detected
              </h4>
              <p className="mt-1 text-sm font-medium text-fg">{p.issue}</p>
              <p className="mt-1 text-sm text-fg-muted">{p.issueDetail}</p>
            </section>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Impact
              </h4>
              <p className="mt-1 text-sm text-fg-muted">{p.impact}</p>
            </section>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Files affected
              </h4>
              <ul className="mt-1 space-y-1 font-mono text-xs text-fg">
                {p.filesAffected.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Recommended change
              </h4>
              <p className="mt-1 text-sm text-fg">{p.recommendedChange}</p>
            </section>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Code example
              </h4>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-bg px-3 py-2 font-mono text-xs text-fg">
                {p.codeExample}
              </pre>
            </section>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Expected improvement
              </h4>
              <p className="mt-1 text-sm text-fg-muted">{p.expectedImprovement}</p>
            </section>

            {diffPreview && !diffPreview.empty ? (
              <details className="rounded-xl border border-border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-fg">
                  Diff preview ({diffPreview.files.length} files)
                </summary>
                <div className="space-y-3 border-t border-border px-3 py-3">
                  <p className="text-xs text-fg-muted">{diffPreview.summary}</p>
                  {diffPreview.files.slice(0, 4).map((f) => (
                    <div key={f.path}>
                      <p className="font-mono text-xs text-accent">
                        {f.action} · {f.path}
                      </p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-fg-muted">
                        {f.unifiedDiff.slice(0, 1200)}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              {proposal.status === "draft" ? (
                <>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void setStatus("approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void setStatus("reject")}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {(proposal.status === "approved" ||
                proposal.status === "ready_for_pr") && (
                <Button
                  href={`/dashboard/developer-mode?opportunityId=${encodeURIComponent(opportunityId)}`}
                  size="sm"
                  variant="secondary"
                >
                  Continue in Developer Mode (draft PR)
                </Button>
              )}
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                GitHub via Integration Hub
              </Link>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
