"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  Gauge,
  ListChecks,
  MessageSquare,
  Swords,
  Shield,
  Target,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  CategoryScores,
  CompetitiveAnalysisPayload,
  GrowthRoadmapItem,
  OpportunityFix,
} from "@/db/schema";
import { ActionProjectsPanel } from "@/components/action-center/action-projects-panel";
import { AdvisorChatPanel } from "@/components/action-center/advisor-chat";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import {
  CompetitiveTabPanel,
  type CompetitorView,
} from "@/components/competitive/competitive-panel";
import { ExecutionModePanel } from "@/components/growth-os/execution-mode";
import {
  EstimateBadge,
  OpportunityCard,
  type OpportunityCardData,
} from "@/components/money-gap/opportunity-card";
import { EstimateDisclaimer } from "@/components/money-gap/disclaimer";
import { RoadmapTimeline } from "@/components/money-gap/roadmap-timeline";
import { ScoreBreakdown } from "@/components/money-gap/score-breakdown";
import { MoneyGapScore } from "@/components/money-gap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  countByGoldenCategory,
  GOLDEN_CATEGORIES,
} from "@/lib/moneygap/categories";
import { cn, formatCurrency } from "@/lib/utils";

export type IntelligenceReportView = {
  id: string;
  title: string;
  status?: string | null;
  supersededByReportId?: string | null;
  overview: string | null;
  opportunitySummary: string | null;
  executiveBrief: string | null;
  moneyGapScore: number;
  revenueAtRisk: number;
  capturePotential: number;
  intelligenceScore: number | null;
  moneyGapEngineStatus: string | null;
  moneyGapEngineError: string | null;
  competitiveEngineStatus: string | null;
  competitiveEngineError: string | null;
  competitiveBrief: string | null;
  competitiveAnalysis: CompetitiveAnalysisPayload | null;
  competitors: CompetitorView[];
  analysisId: string | null;
  categoryScores: CategoryScores | null;
  growthRoadmap: {
    today: GrowthRoadmapItem[];
    thisWeek: GrowthRoadmapItem[];
    thisMonth: GrowthRoadmapItem[];
    nextQuarter: GrowthRoadmapItem[];
  } | null;
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
  agencyBrand?: {
    companyName: string | null;
    contactInfo: string | null;
    reportFooter: string | null;
    showPoweredBy: boolean;
  } | null;
  initialProjects: {
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
    tasks: {
      id: string;
      title: string;
      completed: boolean;
      sortOrder: number;
    }[];
  }[];
  scoreBreakdown: {
    businessClarity: number;
    audienceClarity: number;
    monetizationVisibility: number;
    contentAuthority: number;
    trustSignals: number;
  } | null;
  crawlabilityReport?: {
    score: number | null;
    status: string | null;
    contributors: Record<string, number | null> | null;
    executiveSummary: string | null;
    estimatedImprovement: string | null;
    unavailableReasons?: Record<string, string>;
    previousScore?: number | null;
    delta?: number | null;
    findingCount?: number;
  } | null;
  privacyReport?: {
    score: number | null;
    status: string | null;
    contributors: Record<string, number | null> | null;
    executiveSummary: string | null;
    estimatedImprovement: string | null;
    unavailableReasons?: Record<string, string>;
    previousScore?: number | null;
    delta?: number | null;
    findingCount?: number;
    trackingDetected?: string[];
  } | null;
  website: {
    name: string;
    domain: string;
    url: string;
  };
  businessProfile: {
    industry: string | null;
    businessType: string | null;
    companyType: string | null;
    businessModel: string | null;
    revenueModel: string | null;
    targetCustomer: string | null;
    targetMarket: string | null;
    productsServices: string[] | null;
  } | null;
  audienceProfile: {
    primaryAudience: string | null;
    secondaryAudience: string | null;
    customerProblems: string[] | null;
    customerGoals: string[] | null;
    buyingIntent: string | null;
  } | null;
  contentAnalysis: {
    blogPresence: boolean;
    contentCategories: string[] | null;
    contentFrequency: string | null;
    educationalResources: string[] | null;
    seoOpportunities: string[] | null;
    contentStrengths: string[] | null;
    contentStrategy: string | null;
  } | null;
  insights: {
    id: string;
    category: string;
    key: string;
    title: string;
    body: string | null;
    present: boolean | null;
  }[];
  opportunities: OpportunityCardData[];
  industryPlaybook?: {
    slug: string;
    name: string;
    industrySlug: string;
    businessModelSlug?: string | null;
    patternSlugs?: string[];
    steps: {
      title: string;
      action: string;
      patternSlug?: string;
      patternName?: string;
      moduleId?: string;
      order: number;
    }[];
  } | null;
  industryGapReport?: {
    industrySlug: string;
    industryName: string;
    confidence: number;
    source: "auto" | "override";
    benchmarkSummary: string;
    missingCapabilities: {
      label: string;
      evidence?: string;
      moduleId?: string;
    }[];
    competitorPatterns: string[];
    priorityOpportunities: {
      title: string;
      opportunityId?: string;
      reason: string;
    }[];
    industryFitScore?: number;
  } | null;
  revenueArchitecture?: {
    businessModelSlug: string;
    businessModelName: string;
    stages: {
      id: string;
      label: string;
      description?: string;
      status: "present" | "weak" | "missing";
      evidence?: string;
    }[];
  } | null;
  businessModelGapReport?: {
    businessModelSlug: string;
    businessModelName: string;
    confidence: number;
    source: "auto" | "override";
    benchmarkSummary: string;
    missingCapabilities: {
      label: string;
      evidence?: string;
      moduleId?: string;
    }[];
    competitorPatterns: string[];
    priorityOpportunities: {
      title: string;
      opportunityId?: string;
      reason: string;
    }[];
    businessModelFitScore?: number;
    modelEvidence?: { signal: string; weight: number }[];
  } | null;
  patternMatchReport?: {
    maturity: "early" | "growth" | "scale";
    goalTypesUsed: string[];
    matchedAt: string;
    recommendations: {
      patternSlug: string;
      name: string;
      category: string;
      confidence: number;
      reasoning: string[];
      impactScore: number;
      difficulty: string;
      revenuePotential: number;
      implementationSteps: { title: string; action: string; order: number }[];
    }[];
  } | null;
  analysisMeta?: {
    completedAt: string | null;
    durationMs: number | null;
    engineVersion: string | null;
    trustVersion: string | null;
  } | null;
};

const tabs = [
  { id: "opportunities", label: "Opportunities", icon: Gauge },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "advisor", label: "Advisor", icon: MessageSquare },
  { id: "action", label: "Action", icon: ListChecks },
  { id: "competitive", label: "Competitive", icon: Swords },
  { id: "overview", label: "Understanding", icon: BookOpen },
  { id: "audience", label: "Audience", icon: Users },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "content", label: "Content", icon: Target },
  { id: "trust", label: "Trust", icon: Shield },
] as const;

type TabId = (typeof tabs)[number]["id"];

function isTabId(value: string | null | undefined): value is TabId {
  return !!value && tabs.some((t) => t.id === value);
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className="font-semibold tabular-nums text-fg">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-bg px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className="mt-1 text-sm font-medium text-fg">{value}</p>
    </div>
  );
}

function ExpandableList({
  title,
  items,
  empty = "None detected",
}: {
  title: string;
  items?: string[] | null;
  empty?: string;
}) {
  const [open, setOpen] = useState(false);
  const list = items ?? [];

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-fg">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-fg-muted transition", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="space-y-2 border-t border-border px-4 py-3">
              {list.length === 0 ? (
                <li className="text-sm text-fg-subtle">{empty}</li>
              ) : (
                list.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-fg-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IndustryComparedSection({
  reportId,
  initial,
}: {
  reportId: string;
  initial: NonNullable<IntelligenceReportView["industryGapReport"]>;
}) {
  const [gap, setGap] = useState(initial);
  const [industries, setIndustries] = useState<{ slug: string; name: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/reports/${reportId}/classification`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          industries?: { slug: string; name: string }[];
        };
        setIndustries(data.industries ?? []);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, [reportId]);

  async function onOverride(industrySlug: string) {
    if (!industrySlug || industrySlug === gap.industrySlug) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industrySlug }),
      });
      if (!res.ok) {
        setError("Could not update industry (try again)");
        return;
      }
      const data = (await res.json()) as {
        industryGapReport: typeof gap | null;
      };
      if (data.industryGapReport) setGap(data.industryGapReport);
    } catch {
      setError("Could not update industry");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">
            Compared To Your Industry
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Industry Intelligence™ benchmark vs peer expectations — not a rewrite of
            MoneyGap Score™.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{gap.industryName}</Badge>
          {typeof gap.industryFitScore === "number" && (
            <Badge tone="neutral">Fit {gap.industryFitScore}/100</Badge>
          )}
          <Badge tone="neutral">
            {gap.source === "override" ? "override" : `${gap.confidence}% conf.`}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 text-sm text-fg-muted">
        <p>{gap.benchmarkSummary}</p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
            Override industry
          </label>
          <select
            className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg"
            disabled={pending || industries.length === 0}
            value={gap.industrySlug}
            onChange={(e) => void onOverride(e.target.value)}
          >
            {industries.length === 0 ? (
              <option value={gap.industrySlug}>{gap.industryName}</option>
            ) : (
              industries.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))
            )}
          </select>
          {error && <p className="text-xs text-gap">{error}</p>}
        </div>

        {gap.missingCapabilities.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
              Missing capabilities
            </p>
            <ul className="mt-2 space-y-1">
              {gap.missingCapabilities.map((m) => (
                <li key={m.label} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gap" />
                  <span>
                    <span className="font-medium text-fg">{m.label}</span>
                    {m.evidence ? ` — ${m.evidence}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {gap.competitorPatterns.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
              Peer / competitor patterns
            </p>
            <ul className="mt-2 space-y-1">
              {gap.competitorPatterns.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {gap.priorityOpportunities.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
              Priority opportunities
            </p>
            <ul className="mt-2 space-y-2">
              {gap.priorityOpportunities.map((o) => (
                <li
                  key={o.title}
                  className="rounded-xl border border-border px-3 py-2"
                >
                  <p className="font-medium text-fg">{o.title}</p>
                  <p className="mt-0.5 text-xs text-fg-subtle">{o.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RevenueArchitectureSection({
  architecture,
}: {
  architecture: NonNullable<IntelligenceReportView["revenueArchitecture"]>;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">How You Make Money</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Revenue architecture for {architecture.businessModelName} — missing stages are
            growth leaks.
          </p>
        </div>
        <Badge tone="accent">{architecture.businessModelName}</Badge>
      </CardHeader>
      <CardBody>
        <ol className="space-y-0">
          {architecture.stages.map((stage, idx) => (
            <li key={stage.id} className="relative pl-6">
              {idx < architecture.stages.length - 1 && (
                <span className="absolute left-[9px] top-6 h-[calc(100%-8px)] w-px bg-border" />
              )}
              <span
                className={cn(
                  "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full",
                  stage.status === "present" && "bg-accent",
                  stage.status === "weak" && "bg-fg-subtle",
                  stage.status === "missing" && "bg-gap",
                )}
              />
              <div className="rounded-xl border border-border px-3 py-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-fg">{stage.label}</p>
                  <Badge
                    tone={
                      stage.status === "present"
                        ? "accent"
                        : stage.status === "weak"
                          ? "neutral"
                          : "danger"
                    }
                  >
                    {stage.status}
                  </Badge>
                </div>
                {stage.description && (
                  <p className="mt-0.5 text-xs text-fg-subtle">{stage.description}</p>
                )}
                {stage.evidence && (
                  <p className="mt-1 text-sm text-fg-muted">{stage.evidence}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

function BusinessModelComparedSection({
  reportId,
  initial,
}: {
  reportId: string;
  initial: NonNullable<IntelligenceReportView["businessModelGapReport"]>;
}) {
  const router = useRouter();
  const [gap, setGap] = useState(initial);
  const [models, setModels] = useState<{ slug: string; name: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/reports/${reportId}/classification`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          businessModels?: { slug: string; name: string }[];
        };
        setModels(data.businessModels ?? []);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, [reportId]);

  async function onOverride(businessModelSlug: string) {
    if (!businessModelSlug || businessModelSlug === gap.businessModelSlug) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessModelSlug }),
      });
      if (!res.ok) {
        setError("Could not update business model");
        return;
      }
      const data = (await res.json()) as {
        businessModelGapReport: typeof gap | null;
      };
      if (data.businessModelGapReport) setGap(data.businessModelGapReport);
      router.refresh();
    } catch {
      setError("Could not update business model");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">
            Compared To Your Business Model
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Business Model Intelligence™ peer capabilities — soft fit score is not MoneyGap
            Score™.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{gap.businessModelName}</Badge>
          {typeof gap.businessModelFitScore === "number" && (
            <Badge tone="neutral">Fit {gap.businessModelFitScore}/100</Badge>
          )}
          <Badge tone="neutral">
            {gap.source === "override" ? "override" : `${gap.confidence}% conf.`}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 text-sm text-fg-muted">
        <p>{gap.benchmarkSummary}</p>

        {gap.modelEvidence && gap.modelEvidence.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {gap.modelEvidence.slice(0, 8).map((e) => (
              <Badge key={e.signal} tone="neutral">
                {e.signal.replace(/^(keyword|corpus|heuristic):/, "")}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
            Override business model
          </label>
          <select
            className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg"
            disabled={pending || models.length === 0}
            value={gap.businessModelSlug}
            onChange={(e) => void onOverride(e.target.value)}
          >
            {models.length === 0 ? (
              <option value={gap.businessModelSlug}>{gap.businessModelName}</option>
            ) : (
              models.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))
            )}
          </select>
          {error && <p className="text-xs text-gap">{error}</p>}
        </div>

        {gap.missingCapabilities.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
              Missing capabilities
            </p>
            <ul className="mt-2 space-y-1">
              {gap.missingCapabilities.map((m) => (
                <li key={m.label} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gap" />
                  <span>
                    <span className="font-medium text-fg">{m.label}</span>
                    {m.evidence ? ` — ${m.evidence}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {gap.competitorPatterns.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
              Peer patterns
            </p>
            <ul className="mt-2 space-y-1">
              {gap.competitorPatterns.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {gap.priorityOpportunities.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
              Priority opportunities
            </p>
            <ul className="mt-2 space-y-2">
              {gap.priorityOpportunities.map((o) => (
                <li
                  key={o.title}
                  className="rounded-xl border border-border px-3 py-2"
                >
                  <p className="font-medium text-fg">{o.title}</p>
                  <p className="mt-0.5 text-xs text-fg-subtle">{o.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RecommendedPatternsSection({
  snapshot,
  opportunities,
}: {
  snapshot: NonNullable<IntelligenceReportView["patternMatchReport"]>;
  opportunities: OpportunityCardData[];
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">
            Recommended Growth Patterns
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Growth Pattern Library™ matches for this business context — soft confidence, not
            MoneyGap Score™.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone="accent">{snapshot.maturity} maturity</Badge>
          {snapshot.goalTypesUsed.length > 0 && (
            <Badge tone="neutral">goals: {snapshot.goalTypesUsed.join(", ")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {snapshot.recommendations.map((rec) => {
          const related = opportunities.find((o) => {
            const hay = `${o.title} ${o.category} ${o.moduleId ?? ""}`.toLowerCase();
            return (
              hay.includes(rec.patternSlug.replace(/_/g, " ")) ||
              rec.name
                .toLowerCase()
                .split(/\s+/)
                .some((w) => w.length > 4 && hay.includes(w))
            );
          });
          return (
            <div
              key={rec.patternSlug}
              className="rounded-xl border border-border px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-fg">{rec.name}</p>
                <Badge tone="accent">{rec.category.replace(/_/g, " ")}</Badge>
                <Badge tone="neutral">{rec.confidence}% conf.</Badge>
                <Badge tone="neutral">impact {rec.impactScore}</Badge>
                <Badge tone="neutral">{rec.difficulty}</Badge>
              </div>
              {rec.reasoning.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {rec.reasoning.slice(0, 4).map((r) => (
                    <Badge key={r} tone="neutral">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
              {rec.implementationSteps.length > 0 && (
                <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-sm text-fg-muted">
                  {rec.implementationSteps.slice(0, 3).map((s) => (
                    <li key={s.order}>
                      <span className="font-medium text-fg">{s.title}</span>
                      {s.action ? ` — ${s.action}` : ""}
                    </li>
                  ))}
                </ol>
              )}
              {related && (
                <p className="mt-2 text-xs text-accent">
                  Related opportunity: {related.title}
                </p>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function RetryMoneyGapButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onRetry() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/money-gap`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not restart the Money Gap Engine.");
        setLoading(false);
        return;
      }
      setMessage("Money Gap Engine restarted. Refresh this page in a minute.");
    } catch {
      setMessage("Could not restart the Money Gap Engine.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={onRetry}>
        {loading ? "Starting…" : "Retry Money Gap Engine"}
      </Button>
      {message && <p className="text-xs text-fg-muted">{message}</p>}
    </div>
  );
}

export function IntelligenceReport({
  report,
  initialFocusId = null,
  initialTab = null,
  initialAdvisorOpportunityId = null,
  canImplement = false,
  showSoftUpgrade = false,
}: {
  report: IntelligenceReportView;
  initialFocusId?: string | null;
  initialTab?: string | null;
  initialAdvisorOpportunityId?: string | null;
  canImplement?: boolean;
  showSoftUpgrade?: boolean;
}) {
  const [tab, setTab] = useState<TabId>(
    isTabId(initialTab) ? initialTab : "opportunities",
  );
  const [advisorFocusId, setAdvisorFocusId] = useState<string | null>(
    initialAdvisorOpportunityId,
  );
  const [executionFocusId, setExecutionFocusId] = useState<string | null>(
    initialFocusId,
  );
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const breakdown = report.scoreBreakdown;

  const focusOpportunity =
    report.opportunities.find((o) => o.id === executionFocusId) ?? null;

  const monetizationPresent = report.insights.filter(
    (i) => i.category === "monetization" && i.present === true,
  );
  const monetizationMissing = report.insights.filter(
    (i) => i.category === "monetization" && i.present === false,
  );
  const productInsights = report.insights.filter((i) => i.category === "product");
  const trustFlags = report.insights.filter(
    (i) => i.category === "trust" && i.key !== "detail",
  );
  const trustDetails = report.insights.filter(
    (i) => i.category === "trust" && i.key === "detail",
  );

  const productsByKey = productInsights.reduce<Record<string, string[]>>((acc, item) => {
    const key = item.body ?? item.key;
    acc[key] = acc[key] ?? [];
    acc[key].push(item.title);
    return acc;
  }, {});

  const engineFailed = report.moneyGapEngineStatus === "failed";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {report.status === "archived" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-bg-muted/40 px-3 py-2 text-sm text-fg-muted">
          <span>
            This report was superseded by a newer scan for this website.
          </span>
          {report.supersededByReportId ? (
            <Button
              href={`/reports/${report.supersededByReportId}`}
              size="sm"
              variant="secondary"
            >
              Open live report
            </Button>
          ) : (
            <Button href="/dashboard/reports" size="sm" variant="secondary">
              Back to reports
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gap">Growth intelligence</Badge>
            <span className="text-xs text-fg-subtle">{report.website.domain}</span>
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {report.title}
          </h1>
          <a
            href={report.website.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            {report.website.url}
          </a>
          {report.opportunitySummary && (
            <p className="line-clamp-2 text-sm leading-snug text-fg-muted">
              {report.opportunitySummary}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-border bg-bg-elevated px-3 py-2 sm:self-center">
          <MoneyGapScore score={report.moneyGapScore} size="sm" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Est. annual opp.
            </p>
            <p className="font-display text-base font-semibold tabular-nums text-gap">
              {formatCurrency(report.revenueAtRisk)}
            </p>
            <p className="text-[11px] text-fg-muted">
              Capture {formatCurrency(report.capturePotential)}
            </p>
          </div>
        </div>
      </div>

      {report.opportunities.length > 0 && (
        <CategoryFoundStrip opportunities={report.opportunities} />
      )}

      {showSoftUpgrade &&
        !upgradeDismissed &&
        report.opportunities.length > 0 && (
          <div className="relative">
            <UpgradePrompt
              payload={{
                message: `You found ${report.opportunities.length} Money Gaps. Unlock the full Growth Roadmap.`,
                suggestedPlan: "growth",
                feature: "action_center",
              }}
            />
            <button
              type="button"
              onClick={() => setUpgradeDismissed(true)}
              className="absolute right-3 top-3 rounded-md p-1 text-fg-subtle transition hover:bg-bg-muted hover:text-fg"
              aria-label="Dismiss upgrade prompt"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

      <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-bg/95 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto px-1 py-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-fg-muted hover:bg-bg-muted hover:text-fg",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {tab === "summary" && (
            <div className="space-y-4">
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      Estimated Annual Revenue Opportunity
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-gap">
                      {formatCurrency(report.revenueAtRisk)}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">
                      Capture potential:{" "}
                      <span className="font-semibold text-accent">
                        {formatCurrency(report.capturePotential)}
                      </span>
                    </p>
                  </div>
                  <EstimateDisclaimer />
                </CardBody>
              </Card>

                  {report.categoryScores && (
                    <div id="categories">
                      <Card>
                        <CardHeader>
                          <h2 className="font-display text-lg font-semibold">
                            MoneyGap Score™ by category
                          </h2>
                          <p className="mt-1 text-sm text-fg-muted">
                            Higher = more missing opportunity in that MoneyGap Category™.
                          </p>
                        </CardHeader>
                        <CardBody>
                          <ScoreBreakdown
                            scores={report.categoryScores}
                            opportunities={report.opportunities}
                          />
                        </CardBody>
                      </Card>
                    </div>
                  )}

                  {report.executiveBrief && (
                    <Card>
                      <CardHeader>
                        <h2 className="font-display text-lg font-semibold">
                          Executive Growth Brief
                        </h2>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-3 text-sm leading-relaxed text-fg-muted whitespace-pre-line">
                          {report.executiveBrief}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {report.industryGapReport && (
                    <IndustryComparedSection
                      reportId={report.id}
                      initial={report.industryGapReport}
                    />
                  )}

                  {report.revenueArchitecture && report.revenueArchitecture.stages.length > 0 && (
                    <RevenueArchitectureSection architecture={report.revenueArchitecture} />
                  )}

                  {report.businessModelGapReport && (
                    <BusinessModelComparedSection
                      key={`${report.id}-${report.businessModelGapReport.businessModelSlug}`}
                      reportId={report.id}
                      initial={report.businessModelGapReport}
                    />
                  )}

                  {report.patternMatchReport &&
                    report.patternMatchReport.recommendations.length > 0 && (
                      <RecommendedPatternsSection
                        snapshot={report.patternMatchReport}
                        opportunities={report.opportunities}
                      />
                    )}

                  {report.industryPlaybook && report.industryPlaybook.steps.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div>
                          <h2 className="font-display text-lg font-semibold">
                            {report.industryPlaybook.name}
                          </h2>
                          <p className="mt-1 text-sm text-fg-muted">
                            Industry Growth Playbook from Knowledge Graph™ — recommended sequence, not isolated tips.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone="accent">
                            {report.industryPlaybook.industrySlug.replace(/_/g, " ")}
                          </Badge>
                          {report.industryPlaybook.businessModelSlug && (
                            <Badge tone="neutral">
                              {report.industryPlaybook.businessModelSlug.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardBody>
                        {report.industryPlaybook.patternSlugs &&
                          report.industryPlaybook.patternSlugs.length > 0 && (
                            <p className="mb-3 text-xs text-fg-subtle">
                              Patterns:{" "}
                              {report.industryPlaybook.patternSlugs
                                .map((s) => s.replace(/_/g, " "))
                                .join(" · ")}
                            </p>
                          )}
                        <ol className="space-y-3">
                          {[...report.industryPlaybook.steps]
                            .sort((a, b) => a.order - b.order)
                            .map((step) => {
                              const related = report.opportunities.find((o) => {
                                const hay = `${o.title} ${o.category} ${o.moduleId ?? ""}`.toLowerCase();
                                const moduleHit =
                                  step.moduleId &&
                                  (o.moduleId === step.moduleId ||
                                    o.category.toLowerCase().includes(step.moduleId));
                                const titleHit = step.title
                                  .toLowerCase()
                                  .split(/\s+/)
                                  .some((w) => w.length > 4 && hay.includes(w));
                                return Boolean(moduleHit || titleHit);
                              });
                              return (
                                <li
                                  key={`${step.order}-${step.title}`}
                                  className="rounded-xl border border-border px-3 py-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                                      Step {step.order}
                                    </p>
                                    {(step.patternName || step.patternSlug) && (
                                      <Badge tone="neutral">
                                        {step.patternName ??
                                          step.patternSlug!.replace(/_/g, " ")}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 font-medium text-fg">{step.title}</p>
                                  <p className="mt-1 text-sm text-fg-muted">{step.action}</p>
                                  {related && (
                                    <p className="mt-2 text-xs text-accent">
                                      Related opportunity: {related.title}
                                    </p>
                                  )}
                                </li>
                              );
                            })}
                        </ol>
                      </CardBody>
                    </Card>
                  )}

                  {report.opportunities.length > 0 && (
                    <Card>
                      <CardHeader>
                        <h2 className="font-display text-lg font-semibold">
                          Decision summary
                        </h2>
                        <p className="mt-1 text-sm text-fg-muted">
                          Trust Engine™ priorities and confidence at a glance.{" "}
                          <a
                            href="/dashboard/confidence"
                            className="text-accent underline-offset-2 hover:underline"
                          >
                            Open Confidence Center™
                          </a>
                        </p>
                      </CardHeader>
                      <CardBody className="space-y-3 text-sm">
                        {(() => {
                          const sorted = [...report.opportunities].sort(
                            (a, b) =>
                              (b.opportunityIndex ?? b.priorityScore) -
                              (a.opportunityIndex ?? a.priorityScore),
                          );
                          const top3 = sorted.slice(0, 3);
                          const biggest = top3[0];
                          const quickWins = sorted.filter((o) =>
                            (o.fixes ?? []).some((f) => f.tier === "quick_win"),
                          ).slice(0, 3);
                          const longTerm = sorted.filter((o) =>
                            (o.fixes ?? []).some((f) => f.tier === "long_term"),
                          ).slice(0, 2);
                          const avgConf = Math.round(
                            sorted.reduce((s, o) => s + o.confidence, 0) / sorted.length,
                          );
                          const withIntel = sorted.filter((o) => o.confidenceIntel);
                          const avgOverall =
                            withIntel.length > 0
                              ? Math.round(
                                  withIntel.reduce(
                                    (s, o) => s + (o.confidenceIntel?.overall ?? 0),
                                    0,
                                  ) / withIntel.length,
                                )
                              : null;
                          const impact = sorted.reduce(
                            (s, o) => s + (o.estimatedAnnualRevenue ?? 0),
                            0,
                          );
                          return (
                            <>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                                  Top 3 priorities
                                </p>
                                <ol className="mt-2 list-decimal space-y-1 pl-4 text-fg-muted">
                                  {top3.map((o) => (
                                    <li key={o.id}>
                                      <span className="text-fg">{o.title}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              {biggest && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                                    Biggest opportunity
                                  </p>
                                  <p className="mt-1 text-fg">{biggest.title}</p>
                                  <p className="mt-1 text-xs text-fg-muted">
                                    Next best action:{" "}
                                    {biggest.fixes?.find((f) => f.tier === "quick_win")?.action ??
                                      biggest.fixes?.[0]?.action ??
                                      "Open the opportunity and start an Action Project."}
                                  </p>
                                </div>
                              )}
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                                    Quick wins
                                  </p>
                                  <ul className="mt-1 list-inside list-disc text-fg-muted">
                                    {quickWins.length
                                      ? quickWins.map((o) => <li key={o.id}>{o.title}</li>)
                                      : <li>See opportunity cards for Quick Wins tiers.</li>}
                                  </ul>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                                    Long-term strategy
                                  </p>
                                  <ul className="mt-1 list-inside list-disc text-fg-muted">
                                    {longTerm.length
                                      ? longTerm.map((o) => <li key={o.id}>{o.title}</li>)
                                      : <li>See Long-Term Strategy fixes in cards.</li>}
                                  </ul>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
                                <span>
                                  Confidence summary:{" "}
                                  <span className="font-semibold text-fg">{avgConf}%</span> avg
                                </span>
                                {avgOverall != null && (
                                  <span>
                                    Confidence Intelligence™ overall:{" "}
                                    <span className="font-semibold text-fg">{avgOverall}%</span>
                                  </span>
                                )}
                                {impact > 0 && (
                                  <span>
                                    Estimated business impact:{" "}
                                    <span className="font-semibold text-gap">
                                      {formatCurrency(impact)}
                                    </span>{" "}
                                    <EstimateBadge />
                                  </span>
                                )}
                              </div>
                              {report.analysisMeta && (
                                <p className="text-[11px] text-fg-subtle">
                                  Last analysis:{" "}
                                  {report.analysisMeta.completedAt
                                    ? new Date(report.analysisMeta.completedAt).toLocaleString()
                                    : "—"}
                                  {report.analysisMeta.durationMs != null &&
                                    ` · ${(report.analysisMeta.durationMs / 1000).toFixed(0)}s`}
                                  {report.analysisMeta.engineVersion &&
                                    ` · Engine ${report.analysisMeta.engineVersion}`}
                                  {report.analysisMeta.trustVersion &&
                                    ` · Trust ${report.analysisMeta.trustVersion}`}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </CardBody>
                    </Card>
                  )}

                  {report.crawlabilityReport && (
                    <Card>
                      <CardHeader>
                        <h2 className="font-display text-lg font-semibold">
                          Crawlability Score™
                        </h2>
                        <p className="mt-1 text-sm text-fg-muted">
                          Higher = healthier discovery for search engines and AI systems (distinct from
                          MoneyGap Score™ opportunity polarity).
                        </p>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <p className="font-display text-2xl font-semibold tabular-nums">
                            {report.crawlabilityReport.score != null
                              ? report.crawlabilityReport.score
                              : "—"}
                            {report.crawlabilityReport.score != null ? (
                              <span className="ml-1 text-base font-medium text-fg-subtle">/100</span>
                            ) : null}
                          </p>
                          {report.crawlabilityReport.status ? (
                            <Badge tone="accent">{report.crawlabilityReport.status}</Badge>
                          ) : null}
                          {report.crawlabilityReport.delta != null ? (
                            <p className="text-sm text-fg-muted">
                              Trend: {report.crawlabilityReport.delta > 0 ? "+" : ""}
                              {report.crawlabilityReport.delta} vs previous
                              {report.crawlabilityReport.previousScore != null
                                ? ` (${report.crawlabilityReport.previousScore})`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        {report.crawlabilityReport.executiveSummary ? (
                          <p className="text-sm text-fg-muted">
                            {report.crawlabilityReport.executiveSummary}
                          </p>
                        ) : null}
                        {report.crawlabilityReport.contributors ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(report.crawlabilityReport.contributors).map(
                              ([key, value]) => (
                                <span
                                  key={key}
                                  className="rounded-md border border-border px-2 py-1 text-[11px] text-fg-muted"
                                >
                                  {key}: {value != null ? value : "—"}
                                </span>
                              ),
                            )}
                          </div>
                        ) : null}
                        <p className="text-xs text-fg-subtle">
                          Critical/high crawl issues appear under Opportunities as SEO · Crawlability.
                          {report.crawlabilityReport.estimatedImprovement
                            ? ` ${report.crawlabilityReport.estimatedImprovement}`
                            : ""}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {report.privacyReport && (
                    <Card>
                      <CardHeader>
                        <h2 className="font-display text-lg font-semibold">Privacy Score™</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                          Higher = healthier privacy posture (verified probes only — no invented cookies).
                        </p>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <p className="font-display text-2xl font-semibold tabular-nums">
                            {report.privacyReport.score != null ? report.privacyReport.score : "—"}
                            {report.privacyReport.score != null ? (
                              <span className="ml-1 text-base font-medium text-fg-subtle">/100</span>
                            ) : null}
                          </p>
                          {report.privacyReport.status ? (
                            <Badge tone="accent">{report.privacyReport.status}</Badge>
                          ) : null}
                          {report.privacyReport.delta != null ? (
                            <p className="text-sm text-fg-muted">
                              Trend: {report.privacyReport.delta > 0 ? "+" : ""}
                              {report.privacyReport.delta} vs previous
                              {report.privacyReport.previousScore != null
                                ? ` (${report.privacyReport.previousScore})`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        {report.privacyReport.executiveSummary ? (
                          <p className="text-sm text-fg-muted">{report.privacyReport.executiveSummary}</p>
                        ) : null}
                        {report.privacyReport.contributors ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(report.privacyReport.contributors).map(([key, value]) => (
                              <span
                                key={key}
                                className="rounded-md border border-border px-2 py-1 text-[11px] text-fg-muted"
                              >
                                {key}: {value != null ? value : "—"}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {report.privacyReport.trackingDetected &&
                        report.privacyReport.trackingDetected.length > 0 ? (
                          <p className="text-xs text-fg-subtle">
                            Tracking / third-party hosts detected:{" "}
                            {report.privacyReport.trackingDetected.slice(0, 8).join(", ")}
                          </p>
                        ) : (
                          <p className="text-xs text-fg-subtle">
                            No analytics hosts detected on probed pages.
                          </p>
                        )}
                        <p className="text-xs text-fg-subtle">
                          Critical/high privacy issues appear under Opportunities as Trust · Privacy.
                          {report.privacyReport.estimatedImprovement
                            ? ` ${report.privacyReport.estimatedImprovement}`
                            : ""}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {report.growthRoadmap && (
                    <div id="roadmap">
                      <Card>
                        <CardHeader>
                          <h2 className="font-display text-lg font-semibold">
                            Prioritized Fix Roadmap
                          </h2>
                          <p className="mt-1 text-sm text-fg-muted">
                            What to fix first — from Opportunity Index™ findings across
                            MoneyGap Categories™.
                          </p>
                        </CardHeader>
                        <CardBody>
                          <RoadmapTimeline roadmap={report.growthRoadmap} />
                        </CardBody>
                      </Card>
                    </div>
                  )}

            </div>
          )}

          {tab === "opportunities" && (
            <>
              {engineFailed && (
                <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-4 space-y-3">
                  <p className="text-sm text-fg">
                    {report.moneyGapEngineError ??
                      "Money Gap Engine could not finish. Business understanding is still available."}
                  </p>
                  {report.analysisId && <RetryMoneyGapButton analysisId={report.analysisId} />}
                </div>
              )}

              {report.opportunities.length === 0 && !engineFailed ? (
                <Card>
                  <CardBody>
                    <p className="text-sm text-fg-muted">
                      No money gaps detected yet. Run a fresh analysis or retry the Money Gap Engine.
                    </p>
                    {report.analysisId && <div className="mt-3"><RetryMoneyGapButton analysisId={report.analysisId} /></div>}
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-4">
                  {report.opportunities.map((opportunity, index) => (
                    <div key={opportunity.id} className="space-y-2">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setExecutionFocusId(opportunity.id)}
                        >
                          Work On This
                        </Button>
                      </div>
                      <OpportunityCard
                        opportunity={opportunity}
                        defaultOpen={index === 0 || opportunity.id === executionFocusId}
                        reportId={report.id}
                        canImplement={canImplement}
                        onAskAdvisor={(id) => {
                          setAdvisorFocusId(id);
                          setTab("advisor");
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "advisor" && (
            <AdvisorChatPanel reportId={report.id} focusOpportunityId={advisorFocusId} />
          )}

          {tab === "action" && (
            <ActionProjectsPanel
              reportId={report.id}
              progressStats={report.progressStats}
              initialProjects={report.initialProjects}
            />
          )}

          {tab === "competitive" && (
            <CompetitiveTabPanel
              brief={report.competitiveBrief}
              analysis={report.competitiveAnalysis}
              competitors={report.competitors}
              engineStatus={report.competitiveEngineStatus}
              engineError={report.competitiveEngineError}
              analysisId={report.analysisId}
            />
          )}

          {tab === "overview" && (
            <>
              <Card>
                <CardHeader>
                  <h2 className="font-display text-lg font-semibold">Business understanding</h2>
                </CardHeader>
                <CardBody>
                  <p className="text-base leading-relaxed text-fg-muted">
                    {report.overview ?? "Overview unavailable."}
                  </p>
                </CardBody>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <h2 className="font-display text-lg font-semibold">Website Understanding</h2>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <p className="font-display text-2xl font-semibold tabular-nums">
                      {report.intelligenceScore ?? 0}
                      <span className="text-base text-fg-subtle">/100</span>
                    </p>
                    <ScoreBar label="Business Clarity" value={breakdown?.businessClarity ?? 0} />
                    <ScoreBar label="Audience Clarity" value={breakdown?.audienceClarity ?? 0} />
                    <ScoreBar
                      label="Monetization Visibility"
                      value={breakdown?.monetizationVisibility ?? 0}
                    />
                    <ScoreBar label="Content Authority" value={breakdown?.contentAuthority ?? 0} />
                    <ScoreBar label="Trust Signals" value={breakdown?.trustSignals ?? 0} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <h2 className="font-display text-lg font-semibold">Business Classification</h2>
                  </CardHeader>
                  <CardBody className="grid gap-3 sm:grid-cols-2">
                    <Fact label="Industry" value={report.businessProfile?.industry} />
                    <Fact label="Business Model" value={report.businessProfile?.businessModel} />
                    <Fact label="Company Type" value={report.businessProfile?.companyType} />
                    <Fact label="Target Customer" value={report.businessProfile?.targetCustomer} />
                    <Fact label="Revenue Model" value={report.businessProfile?.revenueModel} />
                    <Fact label="Target Market" value={report.businessProfile?.targetMarket} />
                  </CardBody>
                </Card>
              </div>
            </>
          )}

          {tab === "audience" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <h2 className="font-display text-lg font-semibold">Primary Audience</h2>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {report.audienceProfile?.primaryAudience ?? "Not detected"}
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <h2 className="font-display text-lg font-semibold">Secondary Audience</h2>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {report.audienceProfile?.secondaryAudience ?? "Not detected"}
                    </p>
                  </CardBody>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ExpandableList
                  title="Customer Problems"
                  items={report.audienceProfile?.customerProblems}
                />
                <ExpandableList
                  title="Customer Goals"
                  items={report.audienceProfile?.customerGoals}
                />
              </div>
              <Card>
                <CardHeader>
                  <h2 className="font-display text-lg font-semibold">Buying Intent</h2>
                </CardHeader>
                <CardBody>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {report.audienceProfile?.buyingIntent ?? "Not detected"}
                  </p>
                </CardBody>
              </Card>
            </>
          )}

          {tab === "business" && (
            <>
              <Card>
                <CardHeader>
                  <h2 className="font-display text-lg font-semibold">Product & Service Detection</h2>
                </CardHeader>
                <CardBody className="grid gap-3 md:grid-cols-2">
                  {Object.keys(productsByKey).length === 0 ? (
                    <p className="text-sm text-fg-subtle">No products or services detected.</p>
                  ) : (
                    Object.entries(productsByKey).map(([key, items]) => (
                      <ExpandableList key={key} title={key} items={items} />
                    ))
                  )}
                </CardBody>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <h2 className="font-display text-lg font-semibold">
                      What already exists
                    </h2>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {monetizationPresent.length === 0 ? (
                      <p className="text-sm text-fg-subtle">None clearly visible.</p>
                    ) : (
                      monetizationPresent.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                        >
                          <Check className="h-4 w-4 text-accent" />
                          {item.title}
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <h2 className="font-display text-lg font-semibold">Signals of absence</h2>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    <p className="mb-2 text-xs text-fg-subtle">
                      Full opportunity detail lives in the Opportunities tab.
                    </p>
                    {monetizationMissing.length === 0 ? (
                      <p className="text-sm text-fg-subtle">No obvious gaps flagged.</p>
                    ) : (
                      monetizationMissing.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                        >
                          <X className="h-4 w-4 text-danger" />
                          {item.title}
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>
              </div>
            </>
          )}

          {tab === "content" && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardBody>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      Blog presence
                    </p>
                    <p className="mt-2 font-display text-2xl font-semibold">
                      {report.contentAnalysis?.blogPresence ? "Yes" : "No"}
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      Content frequency
                    </p>
                    <p className="mt-2 font-display text-lg font-semibold">
                      {report.contentAnalysis?.contentFrequency ?? "Unknown"}
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      Categories
                    </p>
                    <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                      {report.contentAnalysis?.contentCategories?.length ?? 0}
                    </p>
                  </CardBody>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <h2 className="font-display text-lg font-semibold">Content Strategy</h2>
                </CardHeader>
                <CardBody>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {report.contentAnalysis?.contentStrategy ?? "Not detected"}
                  </p>
                </CardBody>
              </Card>
              <div className="grid gap-3 md:grid-cols-2">
                <ExpandableList
                  title="Content categories"
                  items={report.contentAnalysis?.contentCategories}
                />
                <ExpandableList
                  title="Educational resources"
                  items={report.contentAnalysis?.educationalResources}
                />
                <ExpandableList
                  title="Content strengths"
                  items={report.contentAnalysis?.contentStrengths}
                />
                <ExpandableList
                  title="SEO opportunities"
                  items={report.contentAnalysis?.seoOpportunities}
                />
              </div>
            </>
          )}

          {tab === "trust" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trustFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3"
                  >
                    <span className="text-sm font-medium text-fg">{flag.title}</span>
                    {flag.present ? (
                      <Badge tone="accent">Found</Badge>
                    ) : (
                      <Badge tone="neutral">Not found</Badge>
                    )}
                  </div>
                ))}
              </div>
              <ExpandableList
                title="Trust details"
                items={trustDetails.map((d) => d.title)}
                empty="No additional trust notes."
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {report.agencyBrand && (report.agencyBrand.companyName || report.agencyBrand.reportFooter) && (
        <footer className="mt-10 border-t border-border pt-6 text-sm text-fg-muted">
          {report.agencyBrand.companyName && (
            <p>
              Prepared by:{" "}
              <span className="font-medium text-fg">{report.agencyBrand.companyName}</span>
            </p>
          )}
          {report.agencyBrand.contactInfo && (
            <p className="mt-1">{report.agencyBrand.contactInfo}</p>
          )}
          {report.agencyBrand.reportFooter && (
            <p className="mt-2 text-xs">{report.agencyBrand.reportFooter}</p>
          )}
          {(report.agencyBrand.showPoweredBy ?? true) && (
            <p className="mt-3 text-xs">Powered by: MoneyGap AI</p>
          )}
        </footer>
      )}

      {focusOpportunity && (
        <ExecutionModePanel
          reportId={report.id}
          opportunity={focusOpportunity}
          website={report.website}
          onExit={() => {
            setExecutionFocusId(null);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("focus");
              window.history.replaceState({}, "", url.pathname + url.search);
            }
          }}
          onAskAdvisor={(id) => {
            setExecutionFocusId(null);
            setAdvisorFocusId(id);
            setTab("advisor");
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("focus");
              url.searchParams.set("tab", "advisor");
              url.searchParams.set("opportunity", id);
              window.history.replaceState({}, "", url.pathname + url.search);
            }
          }}
        />
      )}
    </div>
  );
}

function CategoryFoundStrip({
  opportunities,
}: {
  opportunities: { moduleId?: string | null }[];
}) {
  const counts = countByGoldenCategory(opportunities);
  return (
    <div className="flex flex-wrap gap-2">
      {GOLDEN_CATEGORIES.map((cat) => {
        const n = counts[cat.id] ?? 0;
        return (
          <Badge
            key={cat.id}
            tone={n > 0 ? "gap" : "neutral"}
            className="text-[11px]"
          >
            {cat.shortLabel} Gaps · {n} Found
          </Badge>
        );
      })}
    </div>
  );
}

// Keep type import used for fixes in OpportunityCardData path
export type { OpportunityFix };
