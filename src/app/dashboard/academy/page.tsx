import Link from "next/link";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  isGrowthAcademyEnabled,
  listCategories,
  listPublishedArticles,
  recommendPlaybooksForOpenGaps,
} from "@/lib/growth-academy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardAcademyLearnerPage() {
  const enabled = isGrowthAcademyEnabled();
  let workspaceId: string | null = null;
  let workspaceName = "Your workspace";

  try {
    const ctx = await loadAgencyContext();
    workspaceId = ctx.workspace.id;
    workspaceName = ctx.workspace.agencyName || ctx.workspace.name;
  } catch {
    workspaceId = null;
  }

  const [recs, articles, categories] = await Promise.all([
    workspaceId && enabled
      ? recommendPlaybooksForOpenGaps(workspaceId, 3)
      : Promise.resolve([]),
    enabled ? listPublishedArticles({ limit: 18 }) : Promise.resolve([]),
    enabled ? listCategories() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-5 border-b border-border pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
                {workspaceName}
              </p>
              <Badge tone={enabled ? "accent" : "gap"}>
                {enabled ? "Growth Academy™" : "Disabled"}
              </Badge>
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
              Close the gaps
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              Short playbooks matched to your open Money Gaps — read, then fix
              in the product.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button href="/dashboard/academy/cms" size="sm" variant="secondary">
              Editors
            </Button>
            <Button href="/dashboard/money-gaps" size="sm">
              Open Money Gaps
            </Button>
          </div>
        </div>
      </header>

      {!enabled ? (
        <p className="rounded-xl border border-border bg-bg-muted px-4 py-3 text-sm text-fg-muted">
          Growth Academy™ is turned off. Set{" "}
          <code className="text-xs">FEATURE_GROWTH_ACADEMY</code> to enable.
        </p>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">For you</h2>
              <p className="text-sm text-fg-muted">
                Top open opportunities with a matching playbook.
              </p>
            </div>

            {recs.length === 0 ? (
              <div className="space-y-3 border-y border-border py-8">
                <p className="text-sm text-fg-muted">
                  No open Money Gaps yet. Analyze a site to get playbooks tied to
                  real revenue leaks.
                </p>
                <Button href="/dashboard/analyze" size="sm">
                  Analyze New Website
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {recs.map((rec) => (
                  <li
                    key={rec.gap.id}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-fg">{rec.gap.title}</p>
                        {rec.gap.opportunityIndex != null ? (
                          <Badge tone="accent">
                            Index {Math.round(rec.gap.opportunityIndex)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-fg-subtle">
                        {[rec.gap.websiteDomain || rec.gap.websiteName, rec.gap.category]
                          .filter(Boolean)
                          .join(" · ")}
                        {rec.gap.difficulty
                          ? ` · ${rec.gap.difficulty} difficulty`
                          : ""}
                      </p>
                      {rec.article ? (
                        <p className="text-sm text-fg-muted">
                          Playbook:{" "}
                          <span className="text-fg">{rec.article.title}</span>
                          {rec.article.excerpt
                            ? ` — ${rec.article.excerpt.slice(0, 110)}${
                                rec.article.excerpt.length > 110 ? "…" : ""
                              }`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-sm text-fg-muted">
                          No published playbook match yet — fix the gap in your
                          report.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {rec.article ? (
                        <Button
                          href={`/academy/${rec.article.slug}`}
                          size="sm"
                          variant="secondary"
                        >
                          Read playbook
                        </Button>
                      ) : null}
                      <Button href={rec.fixHref} size="sm">
                        Fix this gap
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Playbook library
                </h2>
                <p className="text-sm text-fg-muted">
                  Browse published guides, then apply them on live gaps.
                </p>
              </div>
              <Link
                href="/academy"
                className="text-sm text-accent hover:underline"
              >
                Public hub →
              </Link>
            </div>

            {articles.length === 0 ? (
              <p className="text-sm text-fg-muted">
                No published articles yet. Editors can draft and publish in the
                CMS.
              </p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {articles.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/academy/${a.slug}`}
                        className="font-medium text-fg transition hover:text-accent"
                      >
                        {a.title}
                      </Link>
                      {a.excerpt ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-fg-muted">
                          {a.excerpt}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
                      <Link
                        href={`/academy/${a.slug}`}
                        className="text-fg-muted transition hover:text-fg"
                      >
                        Read
                      </Link>
                      <span className="text-border" aria-hidden>
                        ·
                      </span>
                      <Link
                        href="/dashboard/money-gaps"
                        className="text-accent hover:underline"
                      >
                        Use in product
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {categories.length > 0 ? (
              <nav
                aria-label="Academy categories"
                className="flex flex-wrap gap-x-1 gap-y-2 text-sm text-fg-muted"
              >
                {categories.map((c, i) => (
                  <span key={c.id} className="inline-flex items-center">
                    {i > 0 ? (
                      <span className="mx-2 text-border" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    <Link
                      href={`/academy/c/${c.slug}`}
                      className="transition hover:text-fg"
                    >
                      {c.name}
                    </Link>
                  </span>
                ))}
              </nav>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
