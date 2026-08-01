"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Comment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

type Approval = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

export function OpportunityCollabPanel({
  reportId,
  opportunityId,
  canApprove = true,
}: {
  reportId: string;
  opportunityId: string;
  canApprove?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        try {
          const [cRes, aRes] = await Promise.all([
            fetch(
              `/api/team/comments?reportId=${reportId}&opportunityId=${opportunityId}`,
            ),
            fetch(
              `/api/team/approvals?reportId=${reportId}&opportunityId=${opportunityId}`,
            ),
          ]);
          const cData = (await cRes.json()) as {
            comments?: Comment[];
            error?: string;
          };
          const aData = (await aRes.json()) as {
            approvals?: Approval[];
            error?: string;
          };
          if (cRes.ok) setComments(cData.comments ?? []);
          if (aRes.ok) setApprovals(aData.approvals ?? []);
          setError(null);
        } catch {
          setError("Could not load collaboration");
        }
      })();
    });
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when panel opens / ids change
  }, [open, reportId, opportunityId]);

  function postComment() {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/team/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, opportunityId, body }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not comment");
          return;
        }
        setBody("");
        load();
      })();
    });
  }

  function approve(status: "approved" | "rejected") {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/team/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, opportunityId, status, note }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not submit approval");
          return;
        }
        setNote("");
        load();
      })();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-bg-muted/30 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-medium text-fg"
        onClick={() => setOpen((v) => !v)}
      >
        Discussion & approval
        <span className="text-xs text-fg-muted">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {error && <p className="text-xs text-fg-muted">{error}</p>}
          <div className="space-y-2">
            {comments.length === 0 && (
              <p className="text-xs text-fg-muted">No comments yet.</p>
            )}
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              >
                <p className="text-fg">{c.body}</p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  {c.authorName} · {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              placeholder="Add a comment…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || !body.trim()}
              onClick={postComment}
            >
              Post
            </Button>
          </div>
          {canApprove && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                Approval
              </p>
              {approvals.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <Badge tone={a.status === "approved" ? "accent" : "neutral"}>
                    {a.status}
                  </Badge>
                  <span className="text-fg-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              <input
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                placeholder="Optional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => approve("approved")}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => approve("rejected")}
                >
                  Reject
                </Button>
                <Link
                  href={`/dashboard/automation?opportunityId=${opportunityId}`}
                  className="text-xs font-medium text-accent hover:underline self-center"
                >
                  Sprint planning →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
