import Link from "next/link";
import {
  FRAMEWORKS,
  TOPICS,
  frameworksWithPublished,
  listPublishedGuides,
  CATEGORY_LABELS,
} from "@/lib/guides";
import { Button } from "@/components/ui/button";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Guides — Framework developer knowledge",
  description:
    "MoneyGap Guides: framework-aware playbooks for SEO, Core Web Vitals, AI Readiness, accessibility, and structured data.",
  path: "/guides",
});

export default async function GuidesHubPage() {
  const published = await listPublishedGuides();
  const withCounts = frameworksWithPublished(published);
  const categories = [...new Set(TOPICS.map((t) => t.category))];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Guides", path: "/guides" },
            ]),
          ),
        }}
      />
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-80" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 lg:pb-20 lg:pt-20">
          <p className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            MoneyGap AI
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Guides for developers who ship growth-ready sites
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Framework-aware playbooks for SEO, Core Web Vitals, AI Readiness,
            accessibility, and structured data — with MoneyGap CLI and extension
            tips built in.
          </p>
          <div className="mt-8">
            <Button href="/guides/search" size="lg">
              Search guides
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-2xl font-semibold text-fg">
            Frameworks with published guides
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {withCounts.map((f) => (
              <Link
                key={f.id}
                href={`/guides/${f.id}`}
                className="rounded-xl border border-border/80 bg-bg-elevated/40 p-5 transition hover:border-accent/40"
              >
                <p className="font-display text-lg font-semibold text-fg">
                  {f.name}
                </p>
                <p className="mt-2 text-sm text-fg-muted">{f.summary}</p>
                <p className="mt-3 text-xs text-fg-subtle">
                  {f.publishedCount} guide{f.publishedCount === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-sm text-fg-muted">
            More frameworks are registered for future overlays:{" "}
            {FRAMEWORKS.filter((f) => !withCounts.some((w) => w.id === f.id))
              .map((f) => f.name)
              .join(", ")}
            .
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-2xl font-semibold text-fg">
            Topic categories
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li
                key={c}
                className="rounded-lg border border-border/70 bg-bg px-4 py-3 text-sm text-fg"
              >
                {CATEGORY_LABELS[c]}
                <span className="mt-1 block text-xs text-fg-muted">
                  {TOPICS.filter((t) => t.category === c)
                    .map((t) => t.name)
                    .slice(0, 4)
                    .join(" · ")}
                  …
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
