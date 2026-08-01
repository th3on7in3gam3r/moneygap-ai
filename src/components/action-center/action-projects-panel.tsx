"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
};

type Project = {
  id: string;
  title: string;
  status: string;
  progress: number;
  priority: string;
  businessImpact: string | null;
  playbook: string;
  updatedAt: string;
  assigneeUserId?: string | null;
  deadline?: string | null;
  clientNotes?: string | null;
  tasks: Task[];
};

export function ActionProjectsPanel({
  reportId,
  progressStats,
  initialProjects = [],
}: {
  reportId: string;
  progressStats: {
    projectsCompleted: number;
    gapsClosed: number;
    recommendationsImplemented: number;
    opportunityCaptured: number;
    timeline: { title: string; at: string }[];
    impactHistory?: {
      title: string;
      impact: number;
      lifecycleStatus: string;
      at: string;
    }[];
    scoreDelta?: number | null;
    comparisonSummary?: string | null;
  };
  initialProjects?: Project[];
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/reports/${reportId}/projects`);
        const data = (await res.json()) as { projects?: Project[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not load projects");
          return;
        }
        setProjects(data.projects ?? []);
      } catch {
        setError("Could not load projects");
      }
    });
  }

  async function toggleTask(projectId: string, taskId: string, completed: boolean) {
    const res = await fetch(
      `/api/reports/${reportId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      },
    );
    const data = (await res.json()) as { project?: Project };
    if (res.ok && data.project) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...data.project!, tasks: data.project!.tasks } : p)),
      );
    }
  }

  async function setStatus(projectId: string, status: string) {
    const res = await fetch(`/api/reports/${reportId}/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { project?: Project };
    if (res.ok && data.project) {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? data.project! : p)));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Progress tracking</h2>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Projects completed" value={String(progressStats.projectsCompleted)} />
          <Stat label="Money Gaps closed" value={String(progressStats.gapsClosed)} />
          <Stat
            label="Recommendations implemented"
            value={String(progressStats.recommendationsImplemented)}
          />
          <Stat
            label="Est. opportunity captured"
            value={formatCurrency(progressStats.opportunityCaptured)}
          />
        </CardBody>
      </Card>

      {progressStats.comparisonSummary && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Re-analysis impact</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {progressStats.scoreDelta != null && (
              <p className="text-sm text-fg-muted">
                Score delta:{" "}
                <span className="font-semibold tabular-nums text-fg">
                  {progressStats.scoreDelta >= 0 ? "+" : ""}
                  {progressStats.scoreDelta}
                </span>
              </p>
            )}
            <p className="text-sm leading-relaxed text-fg">{progressStats.comparisonSummary}</p>
          </CardBody>
        </Card>
      )}

      {(progressStats.impactHistory?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Impact captured</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {progressStats.impactHistory!.map((item) => (
              <div
                key={`${item.title}-${item.at}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-fg">{item.title}</p>
                  <p className="text-[11px] capitalize text-fg-subtle">
                    {item.lifecycleStatus.replace("_", " ")} · {item.at}
                  </p>
                </div>
                <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-accent">
                  {formatCurrency(item.impact)}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {progressStats.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Completion timeline</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {progressStats.timeline.map((item) => (
              <div
                key={`${item.title}-${item.at}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              >
                <span className="text-fg">{item.title}</span>
                <span className="text-xs text-fg-subtle">{item.at}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Action Projects™</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Track checklists from Action Center. Pause, resume, or archive anytime.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={refresh}
          >
            {pending ? "Refreshing…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          {projects.length === 0 && (
            <p className="text-sm text-fg-muted">
              No projects yet. Open an opportunity and choose Create Project or Generate Checklist.
            </p>
          )}
          {projects.map((project) => (
            <div
              key={project.id}
              className="space-y-3 rounded-xl border border-border bg-bg px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-fg">{project.title}</p>
                <Badge tone="neutral">{project.status}</Badge>
                <Badge tone="accent">{project.playbook}</Badge>
                <span className="ml-auto text-xs tabular-nums text-fg-subtle">
                  {project.progress}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              {project.businessImpact && (
                <p className="text-xs text-fg-muted">{project.businessImpact}</p>
              )}
              <ProjectDependencies
                reportId={reportId}
                projectId={project.id}
                projects={projects}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-[11px] text-fg-subtle">
                  Assignee user id
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-bg-elevated px-2 py-1.5 text-xs text-fg"
                    defaultValue={project.assigneeUserId ?? ""}
                    placeholder="Clerk user id"
                    onBlur={(e) => {
                      void fetch(`/api/reports/${reportId}/projects/${project.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          assigneeUserId: e.target.value || null,
                        }),
                      });
                    }}
                  />
                </label>
                <label className="text-[11px] text-fg-subtle">
                  Deadline
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-border bg-bg-elevated px-2 py-1.5 text-xs text-fg"
                    defaultValue={
                      project.deadline
                        ? new Date(project.deadline).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) => {
                      void fetch(`/api/reports/${reportId}/projects/${project.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          deadline: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }),
                      });
                    }}
                  />
                </label>
                <label className="text-[11px] text-fg-subtle sm:col-span-2">
                  Client notes
                  <textarea
                    className="mt-1 w-full rounded-lg border border-border bg-bg-elevated px-2 py-1.5 text-xs text-fg"
                    rows={2}
                    defaultValue={project.clientNotes ?? ""}
                    onBlur={(e) => {
                      void fetch(`/api/reports/${reportId}/projects/${project.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clientNotes: e.target.value || null }),
                      });
                    }}
                  />
                </label>
              </div>
              <ul className="space-y-2">
                {[...(project.tasks ?? [])]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((task) => (
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={task.completed}
                        onChange={(e) =>
                          void toggleTask(project.id, task.id, e.target.checked)
                        }
                      />
                      <span
                        className={
                          task.completed ? "text-fg-subtle line-through" : "text-fg-muted"
                        }
                      >
                        {task.title}
                      </span>
                    </li>
                  ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {project.status === "paused" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void setStatus(project.id, "active")}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void setStatus(project.id, "paused")}
                  >
                    Pause
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void setStatus(project.id, "completed")}
                >
                  Mark complete
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void setStatus(project.id, "archived")}
                >
                  Archive
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}

function ProjectDependencies({
  reportId,
  projectId,
  projects,
}: {
  reportId: string;
  projectId: string;
  projects: Project[];
}) {
  const [deps, setDeps] = useState<{ id: string; dependsOnProjectId: string }[]>([]);
  const [dependsOn, setDependsOn] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    void (async () => {
      const res = await fetch(
        `/api/reports/${reportId}/projects/${projectId}/dependencies`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        dependencies: { id: string; dependsOnProjectId: string }[];
        projects: { id: string; title: string; status: string }[];
      };
      setDeps(data.dependencies ?? []);
      const statusById = new Map(data.projects.map((p) => [p.id, p.status]));
      const isBlocked = (data.dependencies ?? []).some(
        (d) => statusById.get(d.dependsOnProjectId) !== "completed",
      );
      setBlocked(isBlocked);
    })();
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, projectId, projects]);

  async function add() {
    setMsg(null);
    if (!dependsOn) return;
    const res = await fetch(
      `/api/reports/${reportId}/projects/${projectId}/dependencies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnProjectId: dependsOn }),
      },
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Could not add dependency");
      return;
    }
    setDependsOn("");
    load();
  }

  const others = projects.filter((p) => p.id !== projectId);
  if (others.length === 0 && deps.length === 0) return null;

  return (
    <div className="rounded-xl border border-border px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          Dependencies
        </p>
        {blocked && <Badge tone="gap">Blocked</Badge>}
      </div>
      {deps.length > 0 && (
        <ul className="mt-2 space-y-1 text-fg-muted">
          {deps.map((d) => {
            const pred = projects.find((p) => p.id === d.dependsOnProjectId);
            return (
              <li key={d.id}>
                Requires: {pred?.title ?? d.dependsOnProjectId}
                {pred?.status === "completed" ? " ✓" : " (incomplete)"}
              </li>
            );
          })}
        </ul>
      )}
      {others.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-border bg-bg-elevated px-2 py-1 text-xs"
            value={dependsOn}
            onChange={(e) => setDependsOn(e.target.value)}
          >
            <option value="">Depends on…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" onClick={() => void add()}>
            Add
          </Button>
        </div>
      )}
      {msg && <p className="mt-1 text-gap">{msg}</p>}
    </div>
  );
}
