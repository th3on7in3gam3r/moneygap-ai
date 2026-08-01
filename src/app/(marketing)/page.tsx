import { CheckCircle2, LineChart, ScanSearch, Sparkles } from "lucide-react";
import Link from "next/link";
import { StartFreeButton } from "@/components/auth-buttons";
import {
  CapturePotentialBar,
  MoneyGapCard,
  MoneyGapScore,
  RevenueAtRisk,
} from "@/components/money-gap";
import { Button } from "@/components/ui/button";
import { SAMPLE_GAPS } from "@/lib/sample-data";
import { formatCurrency } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <p className="animate-rise font-display text-5xl font-semibold tracking-tight text-fg sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]">
              MoneyGap<span className="text-accent"> AI</span>
            </p>
            <h1 className="animate-rise-delay-1 mt-5 max-w-xl text-2xl font-medium leading-snug tracking-tight text-fg sm:text-3xl">
              Find the revenue your website is leaving on the table.
            </h1>
            <p className="animate-rise-delay-2 mt-5 max-w-lg text-base leading-relaxed text-fg-muted sm:text-lg">
              A precision SaaS for growth teams who want to see money gaps, quantify impact, and
              close leaks before they compound.
            </p>
            <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <StartFreeButton label="Start free" size="lg" />
              <Button href="/pricing" variant="secondary" size="lg">
                View pricing
              </Button>
            </div>
          </div>

          <div className="animate-rise-delay-2 relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl dark:bg-accent/5" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-bg-elevated shadow-[var(--shadow)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gap/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                </div>
                <span className="text-xs text-fg-subtle">
                  Product preview · example board
                </span>
              </div>
              <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
                <MoneyGapScore score={68} size="lg" />
                <div className="space-y-5">
                  <RevenueAtRisk amount={47200} />
                  <CapturePotentialBar atRisk={47200} capture={31800} />
                </div>
              </div>
              <div className="border-t border-border bg-bg-muted/40 px-5 py-4">
                <div className="flex items-center justify-between text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
                    6 open gaps prioritized by monthly impact
                  </span>
                  <span className="tabular-nums text-gap">{formatCurrency(18400)} top leak</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="border-t border-border bg-bg-elevated py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Product</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for teams who measure revenue in leaks, not vanity metrics.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-muted">
              The Growth OS delivers dashboards, reports, and Money Gap scoring —
              plus AI analysis, competitor intelligence, Copilot, and guided capture
              across every property you manage.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ScanSearch,
                title: "See the gap",
                body: "Score every property on how much revenue is slipping through UX, pricing, and conversion cracks.",
              },
              {
                icon: LineChart,
                title: "Quantify impact",
                body: "Every finding is tied to estimated monthly dollars so roadmap debates stay grounded in cash.",
              },
              {
                icon: Sparkles,
                title: "Prioritize capture",
                body: "Ranked recommendations show what to fix first — with confidence and recoverable upside.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-bg p-6">
                <item.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gap">
                Example findings
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Findings that read like a war room, not a spreadsheet.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-fg-muted">
                Illustrative examples — not your workspace data.
              </p>
            </div>
            <Link
              href="/dashboard/money-gaps"
              className="text-sm font-medium text-accent hover:underline"
            >
              Open gap board →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {SAMPLE_GAPS.slice(0, 4).map((gap) => (
              <MoneyGapCard key={gap.id} {...gap} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-hero px-6 py-12 sm:px-12">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Your revenue leaks have a number. Make it smaller.
              </h2>
              <p className="mt-4 text-fg-muted">
                Join the workspace, analyze your site, and see every opportunity
                framed in dollars — from your real reports, not demos.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "Premium dashboard with dark mode",
                  "Live Money Gap scores from your analyses",
                  "AI Copilot, Predictive, and guided capture",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <StartFreeButton label="Create your account" size="lg" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
