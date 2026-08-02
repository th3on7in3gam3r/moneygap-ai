"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Overview = {
  industries: {
    slug: string;
    name: string;
    profile: {
      revenueModels: string[];
      growthPriorities: string[];
      trustSignals: string[];
      description?: string;
      commonGaps?: string[];
      characteristics?: string[];
      conversionPatterns?: string[];
      seoExpectations?: string[];
      benchmarks?: {
        expectedFeatures: string[];
        peerCategoryTargets?: Record<string, number>;
        notes?: string;
      };
    };
    version: string;
    status: string;
    updatedAt: string;
  }[];
  businessModels: {
    slug: string;
    name: string;
    description: string;
    typicalIndustries: string[] | null;
    profile: {
      revenueStructure: string[];
      customerJourney: string[];
      growthLevers: string[];
      commonGaps: string[];
      trustRequirements: string[];
      conversionPatterns: string[];
      retentionStrategies: string[];
      revenueStages: { id: string; label: string; description?: string }[];
      benchmarks?: {
        expectedCapabilities: string[];
        notes?: string;
      };
    } | null;
    version: string;
    status: string;
    updatedAt: string;
  }[];
  patterns: {
    slug: string;
    name: string;
    purpose: string;
    category: string | null;
    description: string | null;
    profile: {
      applicableIndustries: string[];
      applicableBusinessModels: string[];
      requiredConditions: string[];
      maturityLevels: string[];
      goalTypes: string[];
      implementationSteps: { title: string; action: string; order: number }[];
      impactScore: number;
      revenuePotential: number;
    } | null;
    difficulty: string;
    roiEstimate: number;
    version: string;
    status: string;
    updatedAt: string;
  }[];
  rules: {
    slug: string;
    name: string;
    enabled: boolean;
    priority: number;
    conditions: Record<string, unknown>;
    actions: Record<string, unknown>;
    version: string;
    status: string;
    updatedAt: string;
  }[];
  playbooks: {
    slug: string;
    name: string;
    industrySlug: string;
    businessModelSlug: string | null;
    patternSlugs: string[] | null;
    steps: { title: string; action?: string; order: number; patternSlug?: string }[];
    version: string;
    status: string;
    updatedAt: string;
  }[];
  recommendations: {
    slug: string;
    name: string;
    summary: string;
    industrySlug: string | null;
    moduleId: string | null;
    priority: number;
    version: string;
    status: string;
    updatedAt: string;
  }[];
  versions: { version: string; notes: string | null; createdAt: string }[];
};

type Tab =
  | "industries"
  | "business-models"
  | "patterns"
  | "rules"
  | "recommendations"
  | "playbooks"
  | "versions";

export default function KnowledgeCenterPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("industries");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [patternCategoryFilter, setPatternCategoryFilter] = useState<string>("all");

  const PATTERN_CATEGORIES = [
    "all",
    "revenue",
    "acquisition",
    "seo",
    "authority",
    "trust",
    "conversion",
    "retention",
    "automation",
    "ai_adoption",
  ] as const;

  function load() {
    void (async () => {
      const res = await fetch("/api/knowledge");
      if (!res.ok) {
        setError("Could not load Knowledge Graph catalog");
        return;
      }
      setData((await res.json()) as Overview);
    })();
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  function toggleRule(slug: string, enabled: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/knowledge/rules/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        setError("Could not update rule (owner/admin only)");
        return;
      }
      load();
    });
  }

  function patchStatus(
    path: string,
    slug: string,
    status: "active" | "deprecated",
  ) {
    startTransition(async () => {
      const res = await fetch(`/api/knowledge/${path}/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError("Could not update status (owner/admin only)");
        return;
      }
      load();
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "industries", label: "Industries" },
    { id: "business-models", label: "Business Models" },
    { id: "patterns", label: "Patterns" },
    { id: "rules", label: "Rules" },
    { id: "recommendations", label: "Recommendations" },
    { id: "playbooks", label: "Playbooks" },
    { id: "versions", label: "Versions" },
  ];

  return (
    <div className="w-full space-y-8">
      <div>
        <Button href="/dashboard/settings" size="sm" variant="ghost">
          ← Settings
        </Button>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Knowledge Center
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage MoneyGap Knowledge Graph™ industries, business models, patterns,
          rules, and recommendations.
        </p>
      </div>

      {error && <p className="text-sm text-gap">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {!data ? (
        <p className="text-sm text-fg-muted">Loading catalog…</p>
      ) : (
        <>
          {tab === "industries" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.industries.map((i) => (
                <IndustryAdminCard
                  key={i.slug}
                  industry={i}
                  pending={pending}
                  onToggleStatus={() =>
                    patchStatus(
                      "industries",
                      i.slug,
                      i.status === "active" ? "deprecated" : "active",
                    )
                  }
                  onSaved={load}
                  onError={setError}
                />
              ))}
            </div>
          )}

          {tab === "business-models" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.businessModels.map((m) => (
                <BusinessModelAdminCard
                  key={m.slug}
                  model={m}
                  pending={pending}
                  onToggleStatus={() =>
                    patchStatus(
                      "business-models",
                      m.slug,
                      m.status === "active" ? "deprecated" : "active",
                    )
                  }
                  onSaved={load}
                  onError={setError}
                />
              ))}
            </div>
          )}

          {tab === "patterns" && (
            <div className="space-y-4">
              <p className="text-xs text-fg-subtle">
                Soft scoring: higher impactScore (1–100) nudges finding priority when a
                pattern matches — MoneyGap Score™ formula unchanged.
              </p>
              <div className="flex flex-wrap gap-1">
                {PATTERN_CATEGORIES.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    size="sm"
                    variant={patternCategoryFilter === c ? "primary" : "secondary"}
                    onClick={() => setPatternCategoryFilter(c)}
                  >
                    {c === "all" ? "All" : c.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.patterns
                  .filter(
                    (p) =>
                      patternCategoryFilter === "all" ||
                      p.category === patternCategoryFilter,
                  )
                  .map((p) => (
                    <PatternAdminCard
                      key={p.slug}
                      pattern={p}
                      pending={pending}
                      onToggleStatus={() =>
                        patchStatus(
                          "patterns",
                          p.slug,
                          p.status === "active" ? "deprecated" : "active",
                        )
                      }
                      onSaved={load}
                      onError={setError}
                    />
                  ))}
              </div>
            </div>
          )}

          {tab === "rules" && (
            <div className="space-y-3">
              {data.rules.map((r) => (
                <Card key={r.slug}>
                  <CardHeader>
                    <div>
                      <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                      <p className="mt-1 text-xs text-fg-subtle">{r.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={r.enabled ? "accent" : "neutral"}>
                        {r.enabled ? "enabled" : "disabled"}
                      </Badge>
                      <Badge tone="neutral">v{r.version}</Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3 text-sm text-fg-muted">
                    <pre className="overflow-x-auto rounded-xl border border-border bg-bg px-3 py-2 text-xs">
                      {JSON.stringify({ when: r.conditions, then: r.actions }, null, 2)}
                    </pre>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => toggleRule(r.slug, !r.enabled)}
                    >
                      {r.enabled ? "Disable" : "Enable"}
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {tab === "recommendations" && (
            <div className="space-y-3">
              {data.recommendations.map((r) => (
                <Card key={r.slug}>
                  <CardHeader>
                    <div>
                      <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {[r.industrySlug, r.moduleId].filter(Boolean).join(" · ") ||
                          r.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={r.status === "active" ? "accent" : "neutral"}>
                        {r.status}
                      </Badge>
                      <Badge tone="neutral">v{r.version}</Badge>
                      <Badge tone="neutral">P{r.priority}</Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3 text-sm text-fg-muted">
                    <p>{r.summary}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        patchStatus(
                          "recommendations",
                          r.slug,
                          r.status === "active" ? "deprecated" : "active",
                        )
                      }
                    >
                      {r.status === "active" ? "Deprecate" : "Activate"}
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {tab === "playbooks" && (
            <div className="space-y-3">
              {data.playbooks.map((p) => (
                <PlaybookAdminCard
                  key={p.slug}
                  playbook={p}
                  pending={pending}
                  onToggleStatus={() =>
                    patchStatus(
                      "playbooks",
                      p.slug,
                      p.status === "active" ? "deprecated" : "active",
                    )
                  }
                  onSaved={load}
                  onError={setError}
                />
              ))}
            </div>
          )}

          {tab === "versions" && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">Catalog versions</h2>
              </CardHeader>
              <CardBody className="space-y-2">
                {data.versions.map((v) => (
                  <div
                    key={v.version}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-fg">{v.version}</p>
                      <p className="text-xs text-fg-muted">{v.notes}</p>
                    </div>
                    <p className="text-xs text-fg-subtle">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PatternAdminCard({
  pattern,
  pending,
  onToggleStatus,
  onSaved,
  onError,
}: {
  pattern: Overview["patterns"][number];
  pending: boolean;
  onToggleStatus: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [impact, setImpact] = useState(String(pattern.profile?.impactScore ?? 50));
  const [revenue, setRevenue] = useState(
    String(pattern.profile?.revenuePotential ?? pattern.roiEstimate),
  );
  const [saving, setSaving] = useState(false);

  async function saveScoring() {
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge/patterns/${pattern.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            impactScore: Number(impact) || 50,
            revenuePotential: Number(revenue) || 3,
          },
        }),
      });
      if (!res.ok) {
        onError("Could not save pattern scoring (owner/admin only)");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">{pattern.name}</h2>
        <div className="flex flex-wrap gap-1">
          {pattern.category && (
            <Badge tone="accent">{pattern.category.replace(/_/g, " ")}</Badge>
          )}
          <Badge tone={pattern.status === "active" ? "accent" : "neutral"}>
            {pattern.status}
          </Badge>
          <Badge tone="neutral">impact {pattern.profile?.impactScore ?? "—"}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-fg-muted">
        <p>{pattern.description ?? pattern.purpose}</p>
        {pattern.profile && (
          <>
            <p className="text-xs text-fg-subtle">
              Maturity: {(pattern.profile.maturityLevels ?? []).join(", ") || "any"}
              {" · "}
              Goals: {(pattern.profile.goalTypes ?? []).join(", ") || "any"}
            </p>
            {(pattern.profile.applicableIndustries.length > 0 ||
              pattern.profile.applicableBusinessModels.length > 0) && (
              <p className="text-xs text-fg-subtle">
                Industries:{" "}
                {pattern.profile.applicableIndustries.join(", ") || "all"}
                {" · "}
                Models:{" "}
                {pattern.profile.applicableBusinessModels.join(", ") || "all"}
              </p>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-fg-subtle">
            Impact score
            <input
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            />
          </label>
          <label className="text-xs text-fg-subtle">
            Revenue potential (1–5)
            <input
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || pending}
            onClick={() => void saveScoring()}
          >
            {saving ? "Saving…" : "Save scoring"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onToggleStatus}
          >
            {pattern.status === "active" ? "Deprecate" : "Activate"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function PlaybookAdminCard({
  playbook,
  pending,
  onToggleStatus,
  onSaved,
  onError,
}: {
  playbook: Overview["playbooks"][number];
  pending: boolean;
  onToggleStatus: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [patternText, setPatternText] = useState(
    (playbook.patternSlugs ?? []).join("\n"),
  );
  const [saving, setSaving] = useState(false);

  async function savePatterns() {
    setSaving(true);
    try {
      const patternSlugs = patternText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/knowledge/playbooks/${playbook.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternSlugs }),
      });
      if (!res.ok) {
        onError("Could not save playbook (owner/admin only)");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">{playbook.name}</h2>
        <div className="flex flex-wrap gap-1">
          <Badge tone="neutral">{playbook.industrySlug}</Badge>
          {playbook.businessModelSlug && (
            <Badge tone="neutral">{playbook.businessModelSlug}</Badge>
          )}
          <Badge tone={playbook.status === "active" ? "accent" : "neutral"}>
            {playbook.status}
          </Badge>
          <Badge tone="neutral">v{playbook.version}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-fg-muted">
        <ol className="list-decimal space-y-1 pl-5">
          {[...playbook.steps]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <li key={`${s.order}-${s.title}`}>
                {s.title}
                {s.patternSlug ? (
                  <span className="text-fg-subtle"> ({s.patternSlug})</span>
                ) : null}
              </li>
            ))}
        </ol>
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
            Pattern composition (one slug per line)
          </p>
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
            rows={3}
            value={patternText}
            onChange={(e) => setPatternText(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || pending}
            onClick={() => void savePatterns()}
          >
            {saving ? "Saving…" : "Save patterns"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onToggleStatus}
          >
            {playbook.status === "active" ? "Deprecate" : "Activate"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function BusinessModelAdminCard({
  model,
  pending,
  onToggleStatus,
  onSaved,
  onError,
}: {
  model: Overview["businessModels"][number];
  pending: boolean;
  onToggleStatus: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const profile = model.profile;
  const [capabilitiesText, setCapabilitiesText] = useState(
    (profile?.benchmarks?.expectedCapabilities ?? []).join("\n"),
  );
  const [notes, setNotes] = useState(profile?.benchmarks?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveBenchmarks() {
    setSaving(true);
    try {
      const expectedCapabilities = capabilitiesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/knowledge/business-models/${model.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            benchmarks: {
              expectedCapabilities,
              notes: notes || undefined,
            },
          },
        }),
      });
      if (!res.ok) {
        onError("Could not save business model (owner/admin only)");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">{model.name}</h2>
        <div className="flex flex-wrap gap-1">
          <Badge tone="neutral">{model.slug}</Badge>
          <Badge tone={model.status === "active" ? "accent" : "neutral"}>
            {model.status}
          </Badge>
          <Badge tone="neutral">v{model.version}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-fg-muted">
        <p>{model.description}</p>
        {profile?.growthLevers && profile.growthLevers.length > 0 && (
          <p>
            <span className="text-fg-subtle">Growth levers: </span>
            {profile.growthLevers.join(", ")}
          </p>
        )}
        {profile?.commonGaps && profile.commonGaps.length > 0 && (
          <p>
            <span className="text-fg-subtle">Common gaps: </span>
            {profile.commonGaps.join("; ")}
          </p>
        )}
        {profile?.revenueStages && profile.revenueStages.length > 0 && (
          <p>
            <span className="text-fg-subtle">Revenue stages: </span>
            {profile.revenueStages.map((s) => s.label).join(" → ")}
          </p>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
            Benchmark expected capabilities (one per line)
          </p>
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
            rows={4}
            value={capabilitiesText}
            onChange={(e) => setCapabilitiesText(e.target.value)}
          />
          <input
            className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
            placeholder="Benchmark notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || pending}
            onClick={() => void saveBenchmarks()}
          >
            {saving ? "Saving…" : "Save benchmarks"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onToggleStatus}
          >
            {model.status === "active" ? "Deprecate" : "Activate"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function IndustryAdminCard({
  industry,
  pending,
  onToggleStatus,
  onSaved,
  onError,
}: {
  industry: Overview["industries"][number];
  pending: boolean;
  onToggleStatus: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [featuresText, setFeaturesText] = useState(
    (industry.profile.benchmarks?.expectedFeatures ?? []).join("\n"),
  );
  const [notes, setNotes] = useState(industry.profile.benchmarks?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveBenchmarks() {
    setSaving(true);
    try {
      const expectedFeatures = featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/knowledge/industries/${industry.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: industry.profile.description,
          commonGaps: industry.profile.commonGaps,
          benchmarks: {
            expectedFeatures,
            peerCategoryTargets: industry.profile.benchmarks?.peerCategoryTargets,
            notes: notes || undefined,
          },
        }),
      });
      if (!res.ok) {
        onError("Could not save benchmarks (owner/admin only)");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">{industry.name}</h2>
        <div className="flex flex-wrap gap-1">
          <Badge tone="neutral">{industry.slug}</Badge>
          <Badge tone={industry.status === "active" ? "accent" : "neutral"}>
            {industry.status}
          </Badge>
          <Badge tone="neutral">v{industry.version}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-fg-muted">
        {industry.profile.description && <p>{industry.profile.description}</p>}
        <p>
          <span className="text-fg-subtle">Priorities: </span>
          {industry.profile.growthPriorities.join(", ")}
        </p>
        {industry.profile.commonGaps && industry.profile.commonGaps.length > 0 && (
          <p>
            <span className="text-fg-subtle">Common gaps: </span>
            {industry.profile.commonGaps.join("; ")}
          </p>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
            Benchmark expected features (one per line)
          </p>
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
            rows={4}
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
          />
          <input
            className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-fg"
            placeholder="Benchmark notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || pending}
            onClick={() => void saveBenchmarks()}
          >
            {saving ? "Saving…" : "Save benchmarks"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onToggleStatus}
          >
            {industry.status === "active" ? "Deprecate" : "Activate"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
