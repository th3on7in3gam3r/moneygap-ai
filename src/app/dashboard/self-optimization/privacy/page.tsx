"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Finding = {
  id: string;
  category: string;
  title: string;
  problem: string;
  businessImpact: string;
  whyItMatters: string;
  estimatedOpportunity: number | null;
  estimateLabeled: string;
  confidence: number;
  evidence: string[] | null;
  fixPath: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  priority: string | null;
  verificationSteps: string[] | null;
  pageUrl: string | null;
};

type Payload = {
  score: number | null;
  status: string | null;
  contributors: Record<string, number | null> | null;
  summary: string | null;
  estimatedImprovement: string | null;
  previous: number | null;
  delta: number | null;
  unavailableReasons: Record<string, string>;
  findings: Finding[];
  trend: { date: string; privacy: number | null }[];
  headerSamples?: {
    url: string;
    responseHeaders: Record<string, string>;
    setCookies: { name: string; secure: boolean; httpOnly: boolean; sameSite: string | null }[];
  }[];
};

const CONTRIBUTOR_LABELS: Record<string, string> = {
  consentUx: "Consent UX",
  cookieSecurity: "Cookie Security",
  policyDocs: "Policy Docs",
  trackingHygiene: "Tracking Hygiene",
  thirdPartyExposure: "Third-party Exposure",
  consentStorage: "Consent Storage",
};

export default function PrivacyReportPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/self-optimization");
          const body = await res.json();
          if (!res.ok) {
            setError(body.error ?? "Could not load Privacy Report");
            return;
          }
          const privacyFindings = (body.findings as Finding[]).filter(
            (f) => f.category === "privacy",
          );
          setData({
            score: body.scores?.privacy ?? body.privacy?.score ?? null,
            status: body.scores?.privacyStatus ?? body.privacy?.status ?? null,
            contributors:
              body.scores?.privacyContributors ?? body.privacy?.contributors ?? null,
            summary: body.scores?.privacySummary ?? body.privacy?.summary ?? null,
            estimatedImprovement:
              body.scores?.privacyEstimatedImprovement ??
              body.privacy?.estimatedImprovement ??
              null,
            previous: body.privacy?.previous ?? null,
            delta: body.privacy?.delta ?? body.deltas?.privacy ?? null,
            unavailableReasons: body.scores?.unavailableReasons ?? {},
            findings: privacyFindings,
            trend: (body.trend ?? []).map(
              (t: { date: string; privacy?: number | null }) => ({
                date: t.date,
                privacy: t.privacy ?? null,
              }),
            ),
          });
          setError(null);
        } catch {
          setError("Could not load Privacy Report");
        }
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, []);

  const reasons = Object.entries(data?.unavailableReasons ?? {}).filter(([k]) =>
    k.startsWith("privacy"),
  );

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Privacy Intelligence™
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Privacy Report
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
            Privacy Score™ measures consent UX, cookie security, policy docs, and tracking
            hygiene from verified probes — not invented cookies or fake scores.
          </p>
          <p className="text-xs text-fg-subtle">
            Not legal advice. Review policies with counsel before production claims.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard/settings/privacy" size="sm" variant="secondary">
            Privacy Center™
          </Button>
          <Button href="/dashboard/self-optimization" size="sm" variant="secondary">
            Score Center
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={load}>
            {pending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Privacy Score™
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
              {data?.score != null ? data.score : "—"}
              {data?.score != null ? (
                <span className="ml-1 text-sm font-medium text-fg-subtle">/100</span>
              ) : null}
            </p>
            {data?.status ? (
              <Badge tone="accent" className="mt-2">
                {data.status}
              </Badge>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Previous scan
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {data?.previous != null ? data.previous : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Improvement
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {data?.delta != null
                ? `${data.delta > 0 ? "+" : ""}${data.delta}`
                : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Issues
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {data?.findings.length ?? 0}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Executive summary</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p>{data?.summary ?? "Run a self scan to generate Privacy Score™."}</p>
          {data?.estimatedImprovement ? (
            <p className="text-fg">
              <span className="font-medium">Estimated improvement: </span>
              {data.estimatedImprovement}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Score breakdown</h2>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CONTRIBUTOR_LABELS).map(([key, label]) => {
            const v = data?.contributors?.[key] ?? null;
            return (
              <div key={key} className="rounded-xl border border-border px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                  {label}
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {v != null ? `${v}/100` : "—"}
                </p>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {reasons.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Not evaluated</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-fg-muted">
            {reasons.map(([k, v]) => (
              <p key={k}>{v}</p>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Detected issues</h2>
          <p className="text-xs text-fg-subtle">
            Problem · Fix Path™ · verification checklist
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          {(data?.findings ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted">
              No privacy findings yet. Run a self scan from Score Center.
            </p>
          ) : (
            data!.findings.map((f) => {
              const open = expanded === f.id;
              return (
                <div key={f.id} className="rounded-xl border border-border">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setExpanded(open ? null : f.id)}
                  >
                    <div>
                      <p className="font-medium text-fg">{f.title}</p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {(f.priority ?? "medium").toUpperCase()} · Confidence {f.confidence}%
                        {f.estimatedOpportunity != null
                          ? ` · ${formatCurrency(f.estimatedOpportunity)} AI Estimate`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-fg-subtle">{open ? "Hide" : "Details"}</span>
                  </button>
                  {open ? (
                    <div className="space-y-2 border-t border-border px-4 py-3 text-sm text-fg-muted">
                      <p>
                        <span className="font-medium text-fg">Problem: </span>
                        {f.problem}
                      </p>
                      <p>
                        <span className="font-medium text-fg">Why it matters: </span>
                        {f.whyItMatters}
                      </p>
                      <p>
                        <span className="font-medium text-fg">Business impact: </span>
                        {f.businessImpact}
                      </p>
                      {f.evidence?.length ? (
                        <p>
                          <span className="font-medium text-fg">Evidence: </span>
                          {f.evidence.join(" · ")}
                        </p>
                      ) : null}
                      {f.fixPath ? (
                        <p>
                          <span className="font-medium text-fg">Recommended fix: </span>
                          {f.fixPath}
                        </p>
                      ) : null}
                      <p className="text-xs">
                        {f.difficulty ?? "medium"} · {f.estimatedTime ?? "TBD"}
                      </p>
                      {f.verificationSteps?.length ? (
                        <ul className="list-disc pl-5 text-xs">
                          {f.verificationSteps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Developer Mode™ notes</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p>
            Set-Cookie and response header samples are captured during Privacy Intelligence™
            probes when available. Open{" "}
            <a href="/dashboard/developer-mode" className="text-accent hover:underline">
              Developer Mode™
            </a>{" "}
            for stack-level implementation guidance, or re-run a self scan to refresh evidence.
          </p>
          <Button href="/dashboard/settings/privacy" size="sm" variant="secondary">
            Cookie Intelligence™ inventory
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
