import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  LineChart,
  Search,
  Sparkles,
} from "lucide-react";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import {
  ensureGrowthAcademyCatalog,
  isGrowthAcademyEnabled,
  listPublishedArticles,
} from "@/lib/growth-academy";

export const metadata = {
  title: "Growth Academy™",
  description:
    "SEO, conversion, AI, and growth education from MoneyGap AI — thought leadership with editorial control.",
};

const PATHWAYS = [
  {
    href: "/academy/c/seo",
    label: "SEO & GEO",
    body: "Topical authority, buyer-intent coverage, and citation readiness.",
  },
  {
    href: "/academy/c/conversion-optimization",
    label: "Conversion",
    body: "CTA hierarchy, trust signals, and pages that close the gap.",
  },
  {
    href: "/academy/c/guides",
    label: "Guides",
    body: "Implementation playbooks you can ship this week.",
  },
  {
    href: "/academy/c/ai",
    label: "AI visibility",
    body: "Prompts, AI search presence, and product education.",
  },
] as const;

export default async function GrowthAcademyHubPage() {
  if (!isGrowthAcademyEnabled()) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <h1 className="font-display text-3xl font-semibold">Growth Academy™</h1>
        <p className="mt-3 text-fg-muted">This content hub is temporarily unavailable.</p>
      </div>
    );
  }

  await ensureGrowthAcademyCatalog();
  const [featuredList, latest] = await Promise.all([
    listPublishedArticles({ featured: true, limit: 1 }),
    listPublishedArticles({ limit: 6 }),
  ]);
  const featured = featuredList[0] ?? latest[0] ?? null;
  const readingList = latest.filter((a) => a.id !== featured?.id).slice(0, 5);

  return (
    <>
      {/* Hero — one composition, brand first */}
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <p className="animate-rise font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Growth Academy<span className="text-accent">™</span>
            </p>
            <h1 className="animate-rise-delay-1 mt-5 max-w-xl text-xl font-medium leading-snug tracking-tight text-fg sm:text-2xl">
              The growth education layer for teams who close Money Gaps.
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-lg text-base leading-relaxed text-fg-muted">
              SEO, conversion, and AI visibility — written for operators, not vanity
              traffic. Learn what to fix, then run it in MoneyGap AI.
            </p>
            <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <StartFreeButton label="Analyze your site" size="lg" />
              <Button href="#reading" variant="secondary" size="lg">
                Browse the library
              </Button>
            </div>
          </div>

          <div className="animate-rise-delay-2 relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl dark:bg-accent/5" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-bg-elevated shadow-[var(--shadow)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium text-fg-muted">
                    Editorial board
                  </span>
                </div>
                <span className="text-xs text-fg-subtle">Human review before publish</span>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                {[
                  { label: "Buyer-intent coverage", tone: "In progress" },
                  { label: "Trust & conversion signals", tone: "Prioritized" },
                  { label: "Technical SEO foundations", tone: "Queued" },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        {i === 0 ? (
                          <BookOpen className="h-4 w-4" />
                        ) : i === 1 ? (
                          <LineChart className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </span>
                      <p className="text-sm font-medium text-fg">{row.label}</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      {row.tone}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border bg-bg-muted/40 px-5 py-3 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
                  AI drafts stay in review until an editor publishes
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* One job: why Academy exists */}
      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Built into the product
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Education that maps to Fix Paths™ — not a detached blog.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-muted">
              Every lesson is meant to sharpen how you find leaks, prioritize capture, and
              ship changes with MoneyGap AI.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "See the leak",
                body: "Learn the SEO, trust, and offer gaps that quietly cap revenue.",
              },
              {
                icon: LineChart,
                title: "Quantify the path",
                body: "Connect content decisions to traffic, leads, and AI Estimate impact.",
              },
              {
                icon: Sparkles,
                title: "Ship the fix",
                body: "Move from reading to Action Center, Copilot, and live analysis.",
              },
            ].map((item) => (
              <div key={item.title}>
                <item.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured story — single composition, not a card grid */}
      {featured ? (
        <section className="border-t border-border py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gap">
              Featured
            </p>
            <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  {featured.readingTimeMinutes} min read
                </p>
                <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  <Link
                    href={`/academy/${featured.slug}`}
                    className="transition hover:text-accent"
                  >
                    {featured.title}
                  </Link>
                </h2>
                {featured.excerpt ? (
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted">
                    {featured.excerpt}
                  </p>
                ) : null}
                <Link
                  href={`/academy/${featured.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                  Read the article
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="relative min-h-[12rem] overflow-hidden rounded-[1.5rem] border border-border bg-accent-soft/40">
                <div className="absolute inset-0 bg-grid opacity-60" />
                <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                  <p className="font-display text-2xl font-semibold text-fg">
                    Growth Academy™
                  </p>
                  <p className="mt-2 text-sm text-fg-muted">
                    Editorial depth for teams running MoneyGap AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Pathways — curated, not a directory of 15 equal cards */}
      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Pathways
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                Start where your growth is stuck.
              </h2>
            </div>
            <Button href="/academy/search" size="sm" variant="secondary">
              Search the library
            </Button>
          </div>
          <ul className="mt-10 divide-y divide-border border-y border-border">
            {PATHWAYS.map((path) => (
              <li key={path.href}>
                <Link
                  href={path.href}
                  className="group flex flex-col gap-1 py-5 transition sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                >
                  <span className="font-display text-lg font-semibold text-fg group-hover:text-accent">
                    {path.label}
                  </span>
                  <span className="max-w-md text-sm text-fg-muted sm:text-right">
                    {path.body}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-fg-muted">
            More topics —{" "}
            <Link href="/academy/c/case-studies" className="text-accent hover:underline">
              Case studies
            </Link>
            ,{" "}
            <Link href="/academy/c/product-updates" className="text-accent hover:underline">
              Product updates
            </Link>
            ,{" "}
            <Link href="/academy/c/research" className="text-accent hover:underline">
              Research
            </Link>
            ,{" "}
            <Link
              href="/academy/c/ai-prompt-library"
              className="text-accent hover:underline"
            >
              Prompt library
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Reading list */}
      <section id="reading" className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Library
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                Latest from the Academy
              </h2>
            </div>
            <Link
              href="/academy/rss.xml"
              className="text-sm font-medium text-accent hover:underline"
            >
              RSS
            </Link>
          </div>

          {readingList.length === 0 && !featured ? (
            <p className="mt-10 text-sm text-fg-muted">
              Articles are on the way. Explore a pathway above or analyze your site.
            </p>
          ) : (
            <ol className="mt-10 divide-y divide-border border-y border-border">
              {readingList.map((article, index) => (
                <li key={article.id}>
                  <Link
                    href={`/academy/${article.slug}`}
                    className="group grid gap-2 py-6 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-6"
                  >
                    <span className="font-display text-sm tabular-nums text-fg-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="font-display text-lg font-semibold text-fg group-hover:text-accent">
                        {article.title}
                      </span>
                      {article.excerpt ? (
                        <span className="mt-1 block text-sm text-fg-muted line-clamp-2">
                          {article.excerpt}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                      {article.readingTimeMinutes} min
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-[1.5rem] border border-border bg-bg-elevated px-6 py-8 sm:flex-row sm:items-center sm:px-8">
            <div>
              <p className="font-display text-xl font-semibold text-fg">
                Ready to close a gap on your site?
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                Turn what you learn into a live MoneyGap analysis.
              </p>
            </div>
            <StartFreeButton label="Start free analysis" size="lg" />
          </div>
        </div>
      </section>
    </>
  );
}
