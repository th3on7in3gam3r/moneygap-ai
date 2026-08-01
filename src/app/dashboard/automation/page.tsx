"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  FlashToast,
  makeFlashToast,
  type FlashToastState,
} from "@/components/ui/flash-toast";

function readOpportunityId(): string | null {
  if (typeof window === "undefined") return null;
  return (
    new URLSearchParams(window.location.search).get("opportunityId")?.trim() ||
    null
  );
}

type Studio = {
  enabled: boolean;
  message: string | null;
  agents: {
    slug: string;
    name: string;
    description: string | null;
    queueCount: number;
  }[];
  queue: {
    id: string;
    opportunityId: string;
    agentSlug: string | null;
    priority: number;
    status: string;
    title: string | null;
  }[];
  workflows: {
    id: string;
    title: string;
    kind: string;
    agentSlug: string;
    status: string;
    opportunityId: string | null;
    projectId?: string | null;
  }[];
  activeSprint: {
    id: string;
    title: string;
    endsAt: string;
    focus: string[];
  } | null;
  templates: {
    slug: string;
    name: string;
    kind: string;
    agentSlug: string;
    description: string | null;
  }[];
  context: { notes: string[] } | null;
};

type ActionResult = {
  ok: boolean;
  message?: string;
  href?: string;
  hrefLabel?: string;
};

export default function AutomationStudioPage() {
  const opportunityId = useSyncExternalStore(
    () => () => {},
    readOpportunityId,
    () => null,
  );
  const [data, setData] = useState<Studio | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<FlashToastState>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = useCallback(
    (
      message: string,
      tone: "success" | "error" | "info" = "success",
      extras?: { href?: string; hrefLabel?: string },
    ) => {
      setToast(makeFlashToast(message, tone, extras));
    },
    [],
  );

  async function load() {
    try {
      const res = await fetch("/api/automation");
      if (!res.ok) {
        showToast("Could not load Automation Studio", "error");
        return;
      }
      setData((await res.json()) as Studio);
    } catch {
      showToast("Could not load Automation Studio", "error");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  async function run(key: string, label: string, fn: () => Promise<ActionResult>) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const result = await fn();
      if (!result.ok) {
        showToast(result.message ?? `${label} failed`, "error");
        await load();
        return;
      }
      showToast(result.message ?? `${label} complete.`, "success", {
        href: result.href,
        hrefLabel: result.hrefLabel,
      });
      await load();
    } catch {
      showToast(`${label} failed`, "error");
    } finally {
      setBusyKey(null);
    }
  }

  const pending = busyKey != null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <FlashToast toast={toast} onDismiss={dismissToast} />

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Automation Engine™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
          Automation Studio™
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Opportunity Queue, AI Workforce, workflows, and sprints. Drafts only —
          never auto-publishes to CRM or email.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard/executive" size="sm" variant="secondary">
            Executive Briefing
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              void run("refresh", "Refresh", async () => {
                await load();
                return { ok: true, message: "Studio refreshed." };
              })
            }
          >
            {busyKey === "refresh" ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>

      {data?.message && (
        <Card>
          <CardBody className="text-sm text-fg-muted">{data.message}</CardBody>
        </Card>
      )}

      {data?.context?.notes?.length ? (
        <p className="text-xs text-fg-subtle">{data.context.notes.join(" · ")}</p>
      ) : null}

      {opportunityId && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              From Fix Path Chooser™
            </h2>
          </CardHeader>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              Generate a draft workflow for opportunity{" "}
              <span className="font-mono text-xs text-fg">
                {opportunityId.slice(0, 8)}…
              </span>
              . Creates an Action Project only — never auto-publishes.
            </p>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                void run("gen-opp", "Generate workflow", async () => {
                  const res = await fetch("/api/automation/workflows", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ opportunityId }),
                  });
                  const body = (await res.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  if (!res.ok) {
                    return {
                      ok: false,
                      message: body.error ?? "Workflow failed",
                    };
                  }
                  return {
                    ok: true,
                    message: "Draft workflow created — see Workflows below.",
                  };
                })
              }
            >
              {busyKey === "gen-opp" ? "Generating…" : "Generate workflow for this opportunity"}
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">AI Workforce™</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {(data?.agents ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted">No agents loaded yet.</p>
          ) : (
            (data?.agents ?? []).map((a) => (
              <div
                key={a.slug}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium text-fg">{a.name}</p>
                <p className="text-xs text-fg-muted">Queue: {a.queueCount}</p>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            Opportunity Queue™
          </h2>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              void run("sync", "Sync queue", async () => {
                const res = await fetch("/api/automation/queue/sync", {
                  method: "POST",
                });
                const body = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  upserted?: number;
                };
                if (!res.ok) {
                  return { ok: false, message: body.error ?? "Sync failed" };
                }
                const n = body.upserted;
                return {
                  ok: true,
                  message:
                    typeof n === "number"
                      ? `Queue synced — ${n} item${n === 1 ? "" : "s"} updated.`
                      : "Queue synced.",
                };
              })
            }
          >
            {busyKey === "sync" ? "Syncing…" : "Sync queue"}
          </Button>
        </CardHeader>
        <CardBody>
          {!data?.queue.length ? (
            <p className="text-sm text-fg-muted">
              No queue items. Sync after you have open opportunities.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.queue.slice(0, 20).map((q) => (
                <li
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-fg">
                      {q.title ?? q.opportunityId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {q.agentSlug ?? "unassigned"} · {q.status} · P{q.priority}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending || !q.opportunityId}
                      onClick={() =>
                        void run(`wf-${q.id}`, "Generate workflow", async () => {
                          const res = await fetch("/api/automation/workflows", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              opportunityId: q.opportunityId,
                              agentSlug: q.agentSlug ?? undefined,
                            }),
                          });
                          const body = (await res.json().catch(() => ({}))) as {
                            error?: string;
                          };
                          if (!res.ok) {
                            return {
                              ok: false,
                              message: body.error ?? "Workflow failed",
                            };
                          }
                          return {
                            ok: true,
                            message: "Draft workflow created.",
                          };
                        })
                      }
                    >
                      {busyKey === `wf-${q.id}` ? "Generating…" : "Generate workflow"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        void run(`done-${q.id}`, "Mark done", async () => {
                          const res = await fetch(
                            `/api/automation/queue/${q.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "done" }),
                            },
                          );
                          if (!res.ok) {
                            const body = (await res
                              .json()
                              .catch(() => ({}))) as { error?: string };
                            return {
                              ok: false,
                              message: body.error ?? "Could not update item",
                            };
                          }
                          return { ok: true, message: "Marked done in the queue." };
                        })
                      }
                    >
                      {busyKey === `done-${q.id}` ? "Saving…" : "Done"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Sprint</h2>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              void run("sprint", "Plan sprint", async () => {
                const res = await fetch("/api/automation/sprints", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                const body = (await res.json().catch(() => ({}))) as {
                  error?: string;
                };
                if (!res.ok) {
                  return { ok: false, message: body.error ?? "Sprint failed" };
                }
                return { ok: true, message: "Sprint planned from the queue." };
              })
            }
          >
            {busyKey === "sprint" ? "Planning…" : "Plan sprint from queue"}
          </Button>
        </CardHeader>
        <CardBody className="text-sm text-fg-muted">
          {!data?.activeSprint ? (
            <p>No active sprint.</p>
          ) : (
            <div>
              <p className="font-medium text-fg">{data.activeSprint.title}</p>
              <p className="text-xs">
                Ends {new Date(data.activeSprint.endsAt).toLocaleDateString()}
              </p>
              <ul className="mt-2 list-disc pl-4">
                {data.activeSprint.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Workflows</h2>
        </CardHeader>
        <CardBody>
          {!data?.workflows.length ? (
            <p className="text-sm text-fg-muted">No workflows yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.workflows.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-fg">{w.title}</p>
                    <p className="text-xs text-fg-muted">
                      {w.kind} · {w.agentSlug} · {w.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {w.projectId ? (
                      <Button
                        href="/dashboard/money-gaps"
                        size="sm"
                        variant="secondary"
                      >
                        Open Action Center
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        void run(`run-${w.id}`, "Run workflow", async () => {
                          const res = await fetch(
                            `/api/automation/workflows/${w.id}/run`,
                            { method: "POST" },
                          );
                          const body = (await res.json().catch(() => ({}))) as {
                            error?: string;
                            projectId?: string;
                          };
                          if (!res.ok) {
                            return {
                              ok: false,
                              message: body.error ?? "Run failed",
                            };
                          }
                          return {
                            ok: true,
                            message:
                              "Action Project ready — drafts only, never auto-published.",
                            href: "/dashboard/money-gaps",
                            hrefLabel: "Open Action Center →",
                          };
                        })
                      }
                    >
                      {busyKey === `run-${w.id}`
                        ? "Running…"
                        : "Run (Action Project)"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">
            Automation Marketplace™
          </h2>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-2">
          {(data?.templates ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted md:col-span-2">
              No marketplace templates yet.
            </p>
          ) : (
            (data?.templates ?? []).map((t) => (
              <div
                key={t.slug}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-fg">{t.name}</p>
                    <p className="text-xs text-fg-muted">{t.description}</p>
                    <Badge tone="neutral" className="mt-2">
                      {t.kind}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      void run(`install-${t.slug}`, "Install template", async () => {
                        const res = await fetch(
                          `/api/automation/marketplace/${t.slug}/install`,
                          { method: "POST" },
                        );
                        const body = (await res.json().catch(() => ({}))) as {
                          error?: string;
                        };
                        if (!res.ok) {
                          return {
                            ok: false,
                            message: body.error ?? "Install failed",
                          };
                        }
                        return {
                          ok: true,
                          message: `Installed “${t.name}” as a draft workflow.`,
                        };
                      })
                    }
                  >
                    {busyKey === `install-${t.slug}` ? "Installing…" : "Install"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
