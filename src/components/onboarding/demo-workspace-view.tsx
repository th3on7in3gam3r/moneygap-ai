"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MoneyGapScore } from "@/components/money-gap";
import {
  DEMO_WORKSPACE,
  SAMPLE_GAPS,
  SAMPLE_REPORTS,
  SAMPLE_WEBSITES,
} from "@/lib/sample-data";

export function DemoWorkspaceView() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const report = SAMPLE_REPORTS[0]!;
  const topGaps = SAMPLE_GAPS.slice(0, 3);

  async function exitDemo(startSetup: boolean) {
    setBusy(true);
    try {
      await fetch("/api/onboarding/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exit" }),
      });
      if (startSetup) {
        await fetch("/api/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_step", step: "website" }),
        });
        router.push("/dashboard/onboarding");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-gap/40 bg-gap-soft/50 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {DEMO_WORKSPACE.name}
            </h1>
            <Badge tone="gap">Demo data</Badge>
          </div>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Explore sample websites, Growth Reports, Money Gaps, and Fix Paths™ without
            connecting your own site. Nothing here writes to your real workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void exitDemo(true)}>
            Start real setup
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void exitDemo(false)}
          >
            Exit demo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">{report.title}</h2>
            <Badge tone="accent">{report.websiteDomain}</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <MoneyGapScore score={report.moneyGapScore} />
              <div className="text-sm text-fg-muted space-y-1">
                <p>
                  Revenue at risk:{" "}
                  <span className="font-semibold text-fg">
                    ${report.revenueAtRisk.toLocaleString()}
                  </span>{" "}
                  <Badge tone="neutral">AI Estimate</Badge>
                </p>
                <p>{report.summary}</p>
              </div>
            </div>
            <ul className="space-y-2">
              {topGaps.map((g) => (
                <li
                  key={g.id}
                  className="rounded-xl border border-border px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-fg">{g.title}</p>
                    <Badge tone="gap">{g.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">{g.recommendation}</p>
                  <p className="mt-2 text-xs text-fg-subtle">
                    Suggested Fix Path™: Action Center checklist
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="font-display text-base font-semibold">Sample websites</h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {SAMPLE_WEBSITES.map((w) => (
                <div key={w.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-fg-muted">{w.domain}</p>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-display text-base font-semibold">Sample Copilot</h3>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-fg-muted">
              <p className="rounded-xl bg-bg px-3 py-2 text-fg">
                “Prioritize the checkout trust gap first — it has the clearest path to
                captured revenue this quarter.”
              </p>
              <p className="text-xs text-fg-subtle">Demo conversation — not live AI.</p>
              <Link
                href="/dashboard/copilot"
                className="inline-flex text-xs font-semibold text-accent hover:underline"
              >
                Open real Copilot after setup →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
