"use client";

import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import type { UsageSummary } from "@/components/developers/types";

const PRODUCTS = [
  {
    title: "MoneyGap API™",
    body: "Keys, scopes, and /api/v1 analyze · score · opportunities · reports.",
    href: "#keys",
    tab: "keys" as const,
  },
  {
    title: "CLI",
    body: "Free live diagnostics — npx moneygap-scan without an account.",
    href: "/cli",
  },
  {
    title: "Guides",
    body: "Framework how-tos for vitals, schema, metadata, and llms.txt.",
    href: "/guides",
  },
  {
    title: "Programmatic Fix Paths™",
    body: "CLI → API → CI loop for closing top Money Gaps™.",
    href: "/docs/programmatic-fix-paths",
  },
  {
    title: "IDE Prompt",
    body: "Copy-ready Cursor / Claude prompts from live opportunities.",
    href: "/dashboard/ide-prompt",
  },
  {
    title: "Developer Mode™",
    body: "Stack plans and draft PRs (never auto-merges main).",
    href: "/dashboard/developer-mode",
  },
  {
    title: "Growth Badge™",
    body: "Embeddable trust badge + public verification page.",
    href: "/dashboard/badge",
  },
  {
    title: "Integration Hub™",
    body: "Connect GitHub, Cadence Pulse, and inbound connectors.",
    href: "/dashboard/integrations",
  },
];

export function OverviewPanel({
  summary,
  onOpenTab,
}: {
  summary: UsageSummary | null;
  onOpenTab: (tab: "keys" | "webhooks" | "logs" | "resources") => void;
}) {
  const apiLimit = summary?.limits.apiCallsPerMonth ?? 0;
  const apiUsed = summary?.usage.api_call ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Requests this month",
            value: summary?.usage.requestsThisMonth ?? "…",
          },
          {
            label: "API calls (metered)",
            value: `${apiUsed} / ${apiLimit >= 999_999 ? "∞" : apiLimit}`,
          },
          { label: "Errors", value: summary?.usage.errorsThisMonth ?? "…" },
          { label: "Plan", value: summary?.planName ?? "…" },
        ].map((m) => (
          <Card key={m.label}>
            <CardBody>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                {m.label}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {m.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Developer products
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Tools for this workspace and for shipping MoneyGap into other stacks.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRODUCTS.map((p) => {
            const inner = (
              <>
                <p className="font-display text-base font-semibold text-fg">
                  {p.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {p.body}
                </p>
              </>
            );
            if ("tab" in p && p.tab) {
              return (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => onOpenTab(p.tab)}
                  className="rounded-2xl border border-border bg-bg-elevated p-4 text-left transition hover:border-border-strong"
                >
                  {inner}
                </button>
              );
            }
            return (
              <Link
                key={p.title}
                href={p.href}
                className="rounded-2xl border border-border bg-bg-elevated p-4 transition hover:border-border-strong"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p className="font-medium text-fg">Cadence integration</p>
          <p>
            Paste your MoneyGap API key in Cadence → Settings → Integrations →
            Growth stack → MoneyGap AI.
          </p>
          <p>
            Prefer docs?{" "}
            <Link href="/docs/moneygap-api" className="text-accent hover:underline">
              MoneyGap API™
            </Link>
            {" · "}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => onOpenTab("resources")}
            >
              Quickstart & OpenAPI
            </button>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
