"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Stack = {
  frontend?: string | null;
  backend?: string | null;
  database?: string | null;
  orm?: string | null;
  auth?: string | null;
  hosting?: string | null;
  styling?: string | null;
  analytics?: string | null;
  payments?: string | null;
  email?: string | null;
  ai?: string | null;
  evidence: string[];
  confidence: number;
};

type Overview = {
  githubConnected: boolean;
  hubCta: string | null;
  techProfile: {
    id: string;
    stack: Stack;
    confidence: number;
    sourceRepoId: string | null;
    version: string;
    updatedAt: string;
  } | null;
  repos: {
    id: string;
    fullName: string;
    defaultBranch: string;
    htmlUrl: string | null;
    isPrimary: boolean;
    status: string;
    lastAnalyzedAt: string | null;
  }[];
  plans: {
    id: string;
    title: string;
    status: string;
    opportunityId: string | null;
    reportId: string | null;
    repoId: string | null;
    riskLevel: string;
    estimatedTime: string;
    createdAt: string;
  }[];
  prDrafts: {
    id: string;
    planId: string;
    branchName: string;
    prUrl: string | null;
    prNumber: number | null;
    status: string;
    riskSummary: string | null;
  }[];
};

type PlanDetail = {
  plan: {
    id: string;
    title: string;
    plan: {
      summary: string;
      filesCreate: string[];
      filesUpdate: string[];
      componentsReuse: string[];
      estimatedTime: string;
      riskLevel: string;
      riskSummary: string;
      dependencies: string[];
      validationChecklist: string[];
      testingSteps: string[];
      rollbackSteps: string[];
      stackNotes?: string;
    };
  };
  blueprints: {
    id: string;
    tool: string;
    title: string;
    body: string;
  }[];
  prDrafts: Overview["prDrafts"];
};

const STACK_LAYERS: { key: keyof Stack; label: string }[] = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "orm", label: "ORM" },
  { key: "auth", label: "Auth" },
  { key: "hosting", label: "Hosting" },
  { key: "styling", label: "Styling" },
  { key: "analytics", label: "Analytics" },
  { key: "payments", label: "Payments" },
  { key: "email", label: "Email" },
  { key: "ai", label: "AI" },
];

export default function DeveloperModePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlanDetail | null>(null);
  const [authorizeAnalyze, setAuthorizeAnalyze] = useState(false);
  const [authorizePr, setAuthorizePr] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const opportunityId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("opportunityId");
  }, []);

  function load() {
    void (async () => {
      const res = await fetch("/api/developer-mode");
      if (!res.ok) {
        setError("Could not load Developer Mode");
        return;
      }
      const body = (await res.json()) as Overview;
      setData(body);
      setError(null);
    })();
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;
    const planId = selectedPlanId;
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/developer-mode/plans/${planId}`);
        if (!res.ok) {
          setError("Could not load plan");
          return;
        }
        setDetail((await res.json()) as PlanDetail);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, [selectedPlanId]);

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void (async () => {
        try {
          await action();
        } catch {
          setError("Request failed");
        }
      })();
    });
  }

  async function syncRepos() {
    const res = await fetch("/api/developer-mode/repos/sync", { method: "POST" });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? "Sync failed");
      return;
    }
    load();
  }

  async function analyzeRepo(repoId: string) {
    if (!authorizeAnalyze) {
      setError("Check “I authorize Analyze” before running stack detection.");
      return;
    }
    const res = await fetch(`/api/developer-mode/repos/${repoId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorize: true }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? "Analyze failed");
      return;
    }
    setAuthorizeAnalyze(false);
    load();
  }

  async function createPlan() {
    const res = await fetch("/api/developer-mode/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: planTitle || undefined,
        opportunityId: opportunityId || undefined,
      }),
    });
    const body = (await res.json()) as {
      error?: string;
      plan?: { id: string };
    };
    if (!res.ok) {
      setError(body.error ?? "Could not create plan");
      return;
    }
    setPlanTitle("");
    load();
    if (body.plan?.id) setSelectedPlanId(body.plan.id);
  }

  async function generateBlueprints() {
    if (!selectedPlanId) return;
    const res = await fetch(
      `/api/developer-mode/plans/${selectedPlanId}/blueprints`,
      { method: "POST" },
    );
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? "Blueprint generation failed");
      return;
    }
    const detailRes = await fetch(`/api/developer-mode/plans/${selectedPlanId}`);
    if (detailRes.ok) setDetail((await detailRes.json()) as PlanDetail);
  }

  async function createPr() {
    if (!selectedPlanId) return;
    if (!authorizePr) {
      setError("Check “I authorize draft PR” before creating a pull request.");
      return;
    }
    const res = await fetch(`/api/developer-mode/plans/${selectedPlanId}/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorize: true }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? "PR creation failed");
      return;
    }
    setAuthorizePr(false);
    load();
    const detailRes = await fetch(`/api/developer-mode/plans/${selectedPlanId}`);
    if (detailRes.ok) setDetail((await detailRes.json()) as PlanDetail);
  }

  async function copyBlueprint(id: string, body: string) {
    await navigator.clipboard.writeText(body);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const stack = data?.techProfile?.stack;

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Stack Intelligence™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
          Developer Mode™
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Stack Intelligence™, Project Memory™, implementation plans, AI
          blueprints, and authorized draft PRs. Distinct from the API console
          under Developers.
        </p>
      </header>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!data?.githubConnected && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              {data?.hubCta ??
                "Connect GitHub in Integration Hub to sync repositories."}
            </p>
            <Button href="/dashboard/integrations" size="sm">
              Open Integration Hub
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Stack profile</h2>
          {stack && (
            <Badge tone="accent">{stack.confidence}% confidence</Badge>
          )}
        </CardHeader>
        <CardBody className="space-y-3">
          {!stack ? (
            <p className="text-sm text-fg-muted">
              No Project Memory yet. Sync a repo and authorize Analyze.
            </p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {STACK_LAYERS.map(({ key, label }) => {
                  const value = stack[key];
                  if (key === "evidence" || key === "confidence" || !value) {
                    return null;
                  }
                  return (
                    <div key={key} className="text-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                        {label}
                      </p>
                      <p className="text-fg">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stack.evidence.slice(0, 12).map((e) => (
                  <span
                    key={e}
                    className="rounded-md bg-bg-muted px-2 py-0.5 text-[11px] text-fg-muted"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Repositories</h2>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(syncRepos)}
          >
            Sync from GitHub
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={authorizeAnalyze}
              onChange={(e) => setAuthorizeAnalyze(e.target.checked)}
            />
            I authorize Analyze (reads package.json / configs via GitHub)
          </label>
          {!data?.repos.length ? (
            <p className="text-sm text-fg-muted">No repos synced yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.repos.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {r.fullName}
                      {r.isPrimary && (
                        <span className="ml-2 text-[10px] uppercase text-fg-subtle">
                          primary
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {r.defaultBranch} · {r.status}
                      {r.lastAnalyzedAt
                        ? ` · analyzed ${new Date(r.lastAnalyzedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.htmlUrl && (
                      <a
                        href={r.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-xl border border-border bg-bg-elevated px-3.5 text-sm font-medium text-fg hover:bg-bg-muted"
                      >
                        GitHub
                      </a>
                    )}
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => analyzeRepo(r.id))}
                    >
                      Analyze
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
            Implementation plans
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {opportunityId && (
            <p className="text-xs text-fg-muted">
              Prefilling from opportunity{" "}
              <code className="text-fg">{opportunityId}</code>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Plan title (or use opportunity)"
              className="min-w-[220px] flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            <Button size="sm" disabled={pending} onClick={() => run(createPlan)}>
              Create plan
            </Button>
          </div>
          {!data?.plans.length ? (
            <p className="text-sm text-fg-muted">No plans yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.plans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(p.id);
                      setDetail(null);
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedPlanId === p.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:bg-bg-muted"
                    }`}
                  >
                    <span className="font-medium text-fg">{p.title}</span>
                    <span className="ml-2 text-xs text-fg-muted">
                      {p.riskLevel} · {p.estimatedTime}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {detail && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">
              {detail.plan.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(generateBlueprints)}
              >
                Generate blueprints
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <p className="text-fg-muted">{detail.plan.plan.summary}</p>
            {detail.plan.plan.stackNotes && (
              <p className="text-xs text-fg-subtle">{detail.plan.plan.stackNotes}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  Create
                </p>
                <ul className="list-disc pl-4 text-fg-muted">
                  {detail.plan.plan.filesCreate.map((f) => (
                    <li key={f}>
                      <code>{f}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  Update
                </p>
                <ul className="list-disc pl-4 text-fg-muted">
                  {detail.plan.plan.filesUpdate.map((f) => (
                    <li key={f}>
                      <code>{f}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Risk · Testing · Rollback
              </p>
              <p className="text-fg-muted">
                {detail.plan.plan.riskLevel}: {detail.plan.plan.riskSummary}
              </p>
              <ul className="mt-2 list-disc pl-4 text-fg-muted">
                {detail.plan.plan.testingSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <ul className="mt-2 list-disc pl-4 text-fg-muted">
                {detail.plan.plan.rollbackSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="font-medium text-fg">Draft PR</p>
              <label className="flex items-center gap-2 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={authorizePr}
                  onChange={(e) => setAuthorizePr(e.target.checked)}
                />
                I authorize creating a moneygap/* feature branch + draft PR (never
                pushes to main/master)
              </label>
              <Button size="sm" disabled={pending} onClick={() => run(createPr)}>
                Create draft PR
              </Button>
              {detail.prDrafts.map((d) => (
                <p key={d.id} className="text-xs text-fg-muted">
                  {d.status} · {d.branchName}
                  {d.prUrl ? (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={d.prUrl}
                        className="text-accent underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        PR #{d.prNumber}
                      </a>
                    </>
                  ) : null}
                </p>
              ))}
            </div>

            {detail.blueprints.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="font-medium text-fg">AI blueprints</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {detail.blueprints.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge tone="neutral">{b.tool}</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void copyBlueprint(b.id, b.body)}
                        >
                          {copied === b.id ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-fg-muted">
                        {b.body.slice(0, 800)}
                        {b.body.length > 800 ? "…" : ""}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {data && data.prDrafts.length > 0 && !detail && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">PR drafts</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            {data.prDrafts.map((d) => (
              <p key={d.id}>
                {d.status} · {d.branchName}
                {d.prUrl ? (
                  <>
                    {" "}
                    ·{" "}
                    <a href={d.prUrl} className="text-accent underline" target="_blank" rel="noreferrer">
                      Open PR
                    </a>
                  </>
                ) : null}
              </p>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
