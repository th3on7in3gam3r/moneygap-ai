"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { GOAL_TYPES } from "@/lib/growth-os/goal-types";

type Goal = {
  id: string;
  title: string;
  type: string;
  targetValue: string | null;
  status: string;
  priority: number;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("leads");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    void (async () => {
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = (await res.json()) as { goals: Goal[] };
        setGoals(data.goals ?? []);
      }
    })();
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  function create() {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          targetValue: target || null,
        }),
      });
      if (!res.ok) {
        setMsg("Could not create goal");
        return;
      }
      setTitle("");
      setTarget("");
      setMsg("Goal added");
      load();
    });
  }

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      load();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-fg-subtle">
          <Button href="/dashboard" size="sm" variant="ghost">
            ← Overview
          </Button>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Business Goals
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Priorities and recommendations align to the goals you set here.
        </p>
      </div>

      {msg && <p className="text-sm text-accent">{msg}</p>}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Add a goal</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <input
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            placeholder="e.g. Increase qualified leads"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {GOAL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="min-w-[140px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              placeholder="Target (optional)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || !title.trim()}
              onClick={create}
            >
              Add goal
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Your goals</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {goals.length === 0 ? (
            <p className="text-sm text-fg-muted">No goals yet — add one above.</p>
          ) : (
            goals.map((g) => (
              <div
                key={g.id}
                className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{g.title}</p>
                    <Badge tone={g.status === "active" ? "accent" : "neutral"}>
                      {g.status}
                    </Badge>
                    <Badge tone="neutral">{g.type}</Badge>
                  </div>
                  {g.targetValue && (
                    <p className="mt-1 text-xs text-fg-muted">Target: {g.targetValue}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.status === "active" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => setStatus(g.id, "completed")}
                    >
                      Complete
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => setStatus(g.id, "active")}
                    >
                      Reactivate
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => remove(g.id)}
                  >
                    Delete
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
