"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  Briefcase,
  Code2,
  LayoutDashboard,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Mode = "ceo" | "marketing" | "developer" | "agency";

type Overview = {
  enabled: boolean;
  message: string | null;
  modes: { id: Mode; title: string; description: string }[];
  memoryCount: number;
  threads: { id: string; title: string; mode: Mode; updatedAt: string }[];
  websites?: { id: string; name: string; domain: string; url?: string }[];
  focusWebsite?: { id: string; name: string; domain: string } | null;
  context: {
    notes: string[];
    openGapCount: number;
    confidenceOverall: number | null;
    queueDepth: number;
    hubConnected: string[];
    stackSummary: string | null;
    isAgency: boolean;
    focusDomain?: string | null;
  } | null;
};

type Msg = {
  id: string;
  role: string;
  content: string;
  meta?: {
    evidence?: string[];
    confidence?: number | null;
    fixPathId?: string | null;
    requiresApproval?: boolean;
    citations?: string[];
    websiteDomain?: string | null;
    websiteName?: string | null;
  } | null;
};

type MemoryEntry = {
  id: string;
  kind: string;
  key: string;
  value: Record<string, unknown>;
};

type Decision = {
  id: string;
  title: string;
  status: string;
  result: {
    scores: { label: string; score: number; notes: string }[];
    recommendation: string;
    evidence: string[];
    confidence: number;
    fixPathId?: string | null;
    requiresApproval: boolean;
    websiteDomain?: string | null;
    websiteName?: string | null;
  } | null;
};

type Plan = {
  id: string;
  title: string;
  kind: string;
  status: string;
  payload: {
    summary: string;
    priorities: string[];
    roadmap: { title: string; horizon: string; steps: string[] }[];
    confidence: number;
    fixPathHints?: string[];
    websiteDomain?: string | null;
    websiteName?: string | null;
  };
};

const FIX_PATH_LABELS: Record<string, string> = {
  action_assets: "Build with Action Center",
  checklist: "Manual checklist / project",
  developer_ai: "Code + AI",
  automation: "Automation workflow",
  integrations: "Connect tools (Hub)",
  advisor: "Ask Growth Advisor",
};

const MODE_ICONS: Record<Mode, typeof Briefcase> = {
  ceo: Briefcase,
  marketing: Megaphone,
  developer: Code2,
  agency: Users,
};

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "decisions", label: "Decisions" },
  { id: "plans", label: "Plans & Reports" },
  { id: "memory", label: "Memory" },
] as const;

const SUGGESTIONS = [
  "What should I prioritize this week?",
  "Hiring vs automation — which is smarter now?",
  "Draft a quarterly growth focus",
  "How do I close my top Money Gap?",
];

function fixPathHref(id: string) {
  if (id === "developer_ai") return "/dashboard/ide-prompt";
  if (id === "automation") return "/dashboard/automation";
  if (id === "integrations") return "/dashboard/integrations";
  if (id === "advisor") return "/dashboard/reports";
  return "/dashboard/money-gaps";
}

const fieldClass =
  "w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function GrowthCopilotPage() {
  const [tab, setTab] = useState<"chat" | "decisions" | "plans" | "memory">(
    "chat",
  );
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mode, setMode] = useState<Mode>("ceo");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [memKey, setMemKey] = useState("");
  const [memValue, setMemValue] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [optA, setOptA] = useState("Hire a marketer");
  const [optB, setOptB] = useState("Automate nurture workflows");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadOverview(activeWebsiteId?: string | null) {
    const wid = activeWebsiteId !== undefined ? activeWebsiteId : websiteId;
    startTransition(() => {
      void (async () => {
        const qs = wid ? `?website=${wid}` : "";
        const res = await fetch(`/api/copilot${qs}`);
        if (!res.ok) {
          setError("Could not load Growth Copilot");
          return;
        }
        const body = (await res.json()) as Overview;
        setOverview(body);
        if (!websiteId && body.focusWebsite?.id) {
          setWebsiteId(body.focusWebsite.id);
        }
        setError(null);
      })();
    });
  }

  function selectWebsite(id: string) {
    setWebsiteId(id);
    loadOverview(id);
  }

  function loadMemory() {
    void (async () => {
      const res = await fetch("/api/copilot/memory");
      if (!res.ok) return;
      const body = (await res.json()) as { entries: MemoryEntry[] };
      setMemory(body.entries ?? []);
    })();
  }

  function loadDecisions() {
    void (async () => {
      const res = await fetch("/api/copilot/decisions");
      if (!res.ok) return;
      const body = (await res.json()) as { decisions: Decision[] };
      setDecisions(body.decisions ?? []);
    })();
  }

  function loadPlans() {
    void (async () => {
      const res = await fetch("/api/copilot/plans");
      if (!res.ok) return;
      const body = (await res.json()) as { plans: Plan[] };
      setPlans(body.plans ?? []);
    })();
  }

  useEffect(() => {
    const t = setTimeout(() => {
      loadOverview();
      loadMemory();
      loadDecisions();
      loadPlans();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function ensureThread() {
    if (threadId) return threadId;
    const res = await fetch("/api/copilot/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, title: `Ask MoneyGap · ${mode}` }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Could not create thread");
    }
    const body = (await res.json()) as { thread: { id: string } };
    setThreadId(body.thread.id);
    return body.thread.id;
  }

  function sendMessage(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text) return;
    startTransition(() => {
      void (async () => {
        try {
          const id = await ensureThread();
          setDraft("");
          const res = await fetch(`/api/copilot/threads/${id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, websiteId }),
          });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            setError(body.error ?? "Chat failed");
            return;
          }
          const hist = await fetch(`/api/copilot/threads/${id}/messages`);
          if (hist.ok) {
            const body = (await hist.json()) as { messages: Msg[] };
            setMessages(body.messages ?? []);
          }
          loadOverview();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Chat failed");
        }
      })();
    });
  }

  function newThread() {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/copilot/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, title: `Ask MoneyGap · ${mode}` }),
        });
        if (!res.ok) {
          setError("Could not start thread");
          return;
        }
        const body = (await res.json()) as { thread: { id: string } };
        setThreadId(body.thread.id);
        setMessages([]);
        loadOverview();
      })();
    });
  }

  function openThread(id: string) {
    setThreadId(id);
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/copilot/threads/${id}/messages`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          messages: Msg[];
          thread: { mode: Mode };
        };
        setMessages(body.messages ?? []);
        if (body.thread?.mode) setMode(body.thread.mode);
      })();
    });
  }

  const ctx = overview?.context;
  const modes = overview?.modes ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              Growth Copilot™
            </p>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Ask MoneyGap™
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            Strategic partner for priorities, decisions, and Fix Paths. Drafts
            only — never auto-publishes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button href="/dashboard" size="sm" variant="secondary">
            <LayoutDashboard className="size-3.5 opacity-70" />
            Overview
          </Button>
          <Button href="/dashboard/executive" size="sm" variant="secondary">
            Executive Briefing
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              loadOverview();
              loadMemory();
              loadDecisions();
              loadPlans();
            }}
          >
            <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              Showing for
            </p>
            {overview?.focusWebsite ? (
              <>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  {overview.focusWebsite.name ?? "Website"}
                </h2>
                <p className="text-sm text-fg-muted">
                  {overview.focusWebsite.domain}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-fg-muted">
                Analyze a website to unlock property-scoped Copilot context.
              </p>
            )}
          </div>
          {(overview?.websites?.length ?? 0) > 1 ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {(overview?.websites ?? []).map((site) => {
                const active =
                  (websiteId ?? overview?.focusWebsite?.id) === site.id;
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => selectWebsite(site.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-fg-muted hover:border-border-strong hover:text-fg"
                    }`}
                  >
                    {site.name}
                    <span className="ml-1.5 text-fg-subtle">{site.domain}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {overview && !overview.enabled && (
        <Card>
          <CardBody className="text-sm text-fg-muted">
            {overview.message ?? "Growth Copilot is disabled."}
          </CardBody>
        </Card>
      )}

      {ctx && (
        <section
          aria-label="Workspace context"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              label: "Business Memory",
              value: String(overview?.memoryCount ?? 0),
              hint:
                (overview?.memoryCount ?? 0) === 0
                  ? "Add key facts in Memory"
                  : "Facts informing answers",
            },
            {
              label: "Open gaps",
              value: String(ctx.openGapCount),
              hint: ctx.focusDomain
                ? `Scoped to ${ctx.focusDomain}`
                : "Highest-OI opportunities in scope",
            },
            {
              label: "Confidence",
              value:
                ctx.confidenceOverall != null
                  ? String(ctx.confidenceOverall)
                  : "—",
              hint: ctx.confidenceOverall != null ? "Latest snapshot" : "No snapshot yet",
            },
            {
              label: "Automation queue",
              value: String(ctx.queueDepth),
              hint: ctx.stackSummary
                ? `Stack: ${ctx.stackSummary}`
                : "Project Memory optional",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-bg-elevated px-4 py-3.5 shadow-[var(--shadow)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                {stat.label}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight text-fg">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-snug text-fg-muted">{stat.hint}</p>
            </div>
          ))}
        </section>
      )}

      {ctx?.notes?.length ? (
        <p className="text-xs leading-relaxed text-fg-subtle">
          {ctx.notes.slice(0, 2).join(" · ")}
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Copilot sections"
        className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-bg-muted/60 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-bg-elevated text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-fg">
                    Mode
                  </h2>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    Shapes tone and recommendations
                  </p>
                </div>
              </CardHeader>
              <CardBody className="space-y-1.5 pt-0">
                {modes.map((m) => {
                  const Icon = MODE_ICONS[m.id];
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`flex w-full gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-accent bg-accent-soft/60"
                          : "border-transparent hover:border-border hover:bg-bg-muted/80"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-accent text-accent-fg"
                            : "bg-bg-muted text-fg-muted"
                        }`}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-fg">
                          {m.title.replace(/ Mode$/, "")}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">
                          {m.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full"
                  disabled={pending}
                  onClick={newThread}
                >
                  <Plus className="size-3.5" />
                  New thread
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  Recent threads
                </h2>
              </CardHeader>
              <CardBody className="space-y-0.5 pt-0">
                {(overview?.threads ?? []).length === 0 && (
                  <p className="py-2 text-xs text-fg-muted">
                    Conversations appear here after you send a message.
                  </p>
                )}
                {(overview?.threads ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openThread(t.id)}
                    className={`block w-full truncate rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      threadId === t.id
                        ? "bg-bg-muted font-medium text-fg"
                        : "text-fg-muted hover:bg-bg-muted/70 hover:text-fg"
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </CardBody>
            </Card>
          </aside>

          <Card className="flex min-h-[520px] flex-col overflow-hidden">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-fg">
                    Conversation
                  </h2>
                  <p className="text-xs text-fg-muted">
                    {modes.find((m) => m.id === mode)?.title ?? "CEO Mode"} ·
                    drafts for review
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardBody className="flex flex-1 flex-col gap-4">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {!messages.length && (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-2 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <Sparkles className="size-5" />
                    </div>
                    <p className="font-display text-lg font-semibold text-fg">
                      What should we work on?
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-fg-muted">
                      Ask about priorities, trade-offs, quarterly plans, or how
                      to fix a gap — answers cite evidence and Fix Paths.
                    </p>
                    <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={pending}
                          onClick={() => sendMessage(s)}
                          className="rounded-full border border-border bg-bg px-3 py-1.5 text-left text-xs text-fg-muted transition hover:border-accent/40 hover:bg-accent-soft/40 hover:text-fg"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[85%] ${
                          isUser
                            ? "bg-accent text-accent-fg"
                            : "border border-border bg-bg"
                        }`}
                      >
                        {!isUser && (
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                            Copilot
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        {!isUser && m.meta && (
                          <div
                            className={`mt-3 space-y-2 border-t pt-3 text-xs ${
                              isUser
                                ? "border-accent-fg/20"
                                : "border-border text-fg-muted"
                            }`}
                          >
                            <div className="flex flex-wrap gap-2">
                              {m.meta.confidence != null && (
                                <Badge tone="neutral">
                                  Confidence {m.meta.confidence}
                                </Badge>
                              )}
                              {(m.meta.websiteDomain || m.meta.websiteName) && (
                                <Badge tone="accent">
                                  {m.meta.websiteDomain || m.meta.websiteName}
                                </Badge>
                              )}
                              {m.meta.requiresApproval && (
                                <Badge tone="gap">Approval required</Badge>
                              )}
                            </div>
                            {m.meta.evidence?.length ? (
                              <p>
                                Evidence:{" "}
                                {m.meta.evidence.slice(0, 3).join(" · ")}
                              </p>
                            ) : null}
                            {m.meta.fixPathId && (
                              <Link
                                href={fixPathHref(m.meta.fixPathId)}
                                className="inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline"
                              >
                                Fix Path:{" "}
                                {FIX_PATH_LABELS[m.meta.fixPathId] ??
                                  m.meta.fixPathId}
                                <ArrowRight className="size-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border bg-bg p-2 shadow-[inset_0_1px_0_0_var(--border)]">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Ask MoneyGap…"
                  className="min-h-[72px] w-full resize-none border-0 bg-transparent px-2.5 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
                />
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <p className="text-[11px] text-fg-subtle">
                    Enter to send · Shift+Enter for newline
                  </p>
                  <Button
                    size="sm"
                    disabled={pending || !draft.trim()}
                    onClick={() => sendMessage()}
                  >
                    <Send className="size-3.5" />
                    Send
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "decisions" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                Decision Simulator
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Compare options with evidence and confidence. Approvals are
                recorded only — nothing auto-publishes.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Option A
                </span>
                <input
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  className={fieldClass}
                  placeholder="Option A"
                />
              </label>
              <span className="hidden pb-3 text-center text-xs font-medium text-fg-subtle sm:block">
                vs
              </span>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Option B
                </span>
                <input
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  className={fieldClass}
                  placeholder="Option B"
                />
              </label>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void (async () => {
                      const res = await fetch("/api/copilot/decisions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: `${optA} vs ${optB}`,
                          options: [{ label: optA }, { label: optB }],
                          websiteId,
                        }),
                      });
                      if (!res.ok) {
                        const body = (await res.json()) as { error?: string };
                        setError(body.error ?? "Decision failed");
                        return;
                      }
                      loadDecisions();
                    })();
                  })
                }
              >
                Compare
              </Button>
            </div>

            {!decisions.length && (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
                No comparisons yet. Try hiring vs automation, or marketing vs
                development.
              </p>
            )}

            <ul className="space-y-3">
              {decisions.map((d) => (
                <li
                  key={d.id}
                  className="rounded-2xl border border-border bg-bg px-4 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{d.title}</p>
                      {(d.result?.websiteDomain || d.result?.websiteName) && (
                        <Badge tone="accent">
                          {d.result.websiteDomain || d.result.websiteName}
                        </Badge>
                      )}
                    </div>
                    <Badge tone={d.status === "approved" ? "accent" : "neutral"}>
                      {d.status}
                    </Badge>
                  </div>
                  {d.result && (
                    <div className="mt-3 space-y-3">
                      <p className="leading-relaxed text-fg-muted">
                        {d.result.recommendation}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {d.result.scores.map((s) => (
                          <div
                            key={s.label}
                            className="rounded-xl border border-border bg-bg-elevated px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-fg">{s.label}</span>
                              <span className="font-display text-lg tabular-nums text-accent">
                                {s.score}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-fg-subtle">{s.notes}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-fg-subtle">
                        Confidence {d.result.confidence}
                        {d.result.evidence?.length
                          ? ` · ${d.result.evidence.slice(0, 2).join(" · ")}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        {d.result.fixPathId && (
                          <Link
                            href={fixPathHref(d.result.fixPathId)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
                          >
                            Fix Path:{" "}
                            {FIX_PATH_LABELS[d.result.fixPathId] ??
                              d.result.fixPathId}
                            <ArrowRight className="size-3" />
                          </Link>
                        )}
                        {d.status === "draft" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={pending}
                            onClick={() =>
                              startTransition(() => {
                                void (async () => {
                                  await fetch("/api/copilot/decisions", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ approveId: d.id }),
                                  });
                                  loadDecisions();
                                })();
                              })
                            }
                          >
                            Approve (record only)
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {tab === "plans" && (
        <Card>
          <CardHeader className="flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                Plans & reports
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Generate draft strategies and period reports. AI Estimate —
                review before acting.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["growth", "Growth"],
                  ["priority", "Priorities"],
                  ["quarterly", "Quarterly"],
                  ["roadmap", "Roadmap"],
                  ["weekly_report", "Weekly"],
                  ["monthly_report", "Monthly"],
                  ["client_report", "Client"],
                ] as const
              ).map(([kind, label]) => (
                <Button
                  key={kind}
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => {
                      void (async () => {
                        const isReport = kind.endsWith("_report");
                        const res = await fetch(
                          isReport ? "/api/copilot/reports" : "/api/copilot/plans",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ kind, websiteId }),
                          },
                        );
                        if (!res.ok) {
                          const body = (await res.json()) as { error?: string };
                          setError(
                            body.error ??
                              (isReport ? "Report failed" : "Plan failed"),
                          );
                          return;
                        }
                        loadPlans();
                      })();
                    })
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {!plans.length && (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
                No drafts yet. Generate a growth plan or weekly report above.
              </p>
            )}
            {plans.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-border bg-bg px-4 py-4 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-fg">{p.title}</h3>
                  <Badge tone="neutral">{p.kind.replace(/_/g, " ")}</Badge>
                  <Badge tone="accent">{p.status}</Badge>
                  {(p.payload.websiteDomain || p.payload.websiteName) && (
                    <Badge tone="accent">
                      {p.payload.websiteDomain || p.payload.websiteName}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 leading-relaxed text-fg-muted">
                  {p.payload.summary}
                </p>
                {p.payload.priorities.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-fg-subtle">
                    {p.payload.priorities.slice(0, 5).map((x) => (
                      <li key={x} className="flex gap-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                        {x}
                      </li>
                    ))}
                  </ul>
                )}
                {p.payload.fixPathHints?.[0] && (
                  <Link
                    href={fixPathHref(p.payload.fixPathHints[0])}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Fix Path:{" "}
                    {FIX_PATH_LABELS[p.payload.fixPathHints[0]] ??
                      p.payload.fixPathHints[0]}
                    <ArrowRight className="size-3" />
                  </Link>
                )}
              </article>
            ))}
          </CardBody>
        </Card>
      )}

      {tab === "memory" && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                Business Memory™
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Durable workspace facts Copilot uses across conversations —
                distinct from Project Memory™ (tech stack).
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-bg p-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1 space-y-1.5 sm:max-w-[10rem]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Key
                </span>
                <input
                  value={memKey}
                  onChange={(e) => setMemKey(e.target.value)}
                  placeholder="e.g. icp"
                  className={fieldClass}
                />
              </label>
              <label className="block min-w-0 flex-[2] space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Fact
                </span>
                <input
                  value={memValue}
                  onChange={(e) => setMemValue(e.target.value)}
                  placeholder="Durable business fact or preference"
                  className={fieldClass}
                />
              </label>
              <Button
                size="sm"
                className="shrink-0"
                disabled={pending || !memKey.trim() || !memValue.trim()}
                onClick={() =>
                  startTransition(() => {
                    void (async () => {
                      const res = await fetch("/api/copilot/memory", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          kind: "fact",
                          key: memKey.trim(),
                          value: memValue.trim(),
                        }),
                      });
                      if (!res.ok) {
                        setError("Could not save memory");
                        return;
                      }
                      setMemKey("");
                      setMemValue("");
                      loadMemory();
                      loadOverview();
                    })();
                  })
                }
              >
                Save
              </Button>
            </div>

            {!memory.length ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
                No entries yet. Add ICP, pricing model, geography, or risk
                preferences.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {memory.map((e) => (
                  <li key={e.id} className="px-4 py-3.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{e.kind}</Badge>
                      <p className="font-medium text-fg">{e.key}</p>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-fg-muted">
                      {typeof e.value.text === "string"
                        ? e.value.text
                        : JSON.stringify(e.value)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
