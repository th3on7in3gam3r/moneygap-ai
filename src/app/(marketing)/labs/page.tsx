import type { Metadata } from "next";
import Link from "next/link";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { listRecentPublicAudits } from "@/lib/labs/audits";
import { CURATED_LAB_ARTICLES } from "@/lib/labs/curated";
import { breadcrumbJsonLd, buildPageMetadata, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Open Audits & Labs — MoneyGap AI",
  description:
    "Public open-source audit snapshots and performance comparisons from free MoneyGap sandbox scans. AI Estimate framing only — not guaranteed ROI.",
  path: "/labs",
});

export default async function LabsPage() {
  let recent: Awaited<ReturnType<typeof listRecentPublicAudits>> = [];
  try {
    recent = await listRecentPublicAudits(12);
  } catch {
    recent = [];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Labs", path: "/labs" },
            ]),
          ),
        }}
      />
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-8 lg:pb-20 lg:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Labs
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Open Audits
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Public, opt-in snapshots from free sandbox diagnostics — crawlability,
            schema, and performance signals. Compare URLs or read curated
            framework writeups. Figures are decision aids (AI Estimate), not
            guarantees.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/labs/compare" size="lg">
              Compare two URLs
            </Button>
            <Button href="/" variant="secondary" size="lg">
              Run free sandbox
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Curated comparisons
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {CURATED_LAB_ARTICLES.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/labs/compare/${a.slug}`}
                  className="block rounded-2xl border border-border bg-bg p-5 transition hover:border-accent/40"
                >
                  <p className="font-display text-lg font-semibold text-fg">
                    {a.title}
                  </p>
                  <p className="mt-2 text-sm text-fg-muted">{a.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Recent Open Audits
          </h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">
              No public audits yet. Run a free scan on the homepage and choose{" "}
              <span className="text-fg">Publish to Open Audits</span>.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-bg">
              {recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/labs/audits/${row.slug}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm transition hover:bg-bg-muted/50"
                  >
                    <span className="font-medium text-fg">{row.hostname}</span>
                    <span className="text-fg-muted">
                      Score {row.score}/100 ·{" "}
                      {new Date(row.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8">
            <StartFreeButton label="Start Free Trial" size="lg" />
          </div>
        </div>
      </section>
    </>
  );
}
