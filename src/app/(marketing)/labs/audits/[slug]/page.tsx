import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartFreeButton } from "@/components/auth-buttons";
import { getPublicAuditBySlug } from "@/lib/labs/audits";
import type { DiagnosticFinding } from "@/lib/public-diagnostics";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  jsonLdScript,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublicAuditBySlug(slug).catch(() => null);
  if (!row) {
    return buildPageMetadata({
      title: "Open Audit — MoneyGap AI",
      description: "Public MoneyGap sandbox audit snapshot.",
      path: `/labs/audits/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `Open Audit: ${row.hostname} (${row.score}/100) — MoneyGap AI`,
    description: `Public sandbox diagnostics for ${row.hostname}. Score ${row.score}/100. AI Estimate framing — not guaranteed ROI.`,
    path: `/labs/audits/${row.slug}`,
  });
}

export default async function OpenAuditPage({ params }: Props) {
  const { slug } = await params;
  const row = await getPublicAuditBySlug(slug).catch(() => null);
  if (!row) notFound();

  const findings = (row.findings as DiagnosticFinding[]) ?? [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: `Open Audit: ${row.hostname}`,
            description: `Sandbox diagnostics score ${row.score}/100`,
            datePublished: row.createdAt.toISOString(),
            author: { "@type": "Organization", name: "MoneyGap AI" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Labs", path: "/labs" },
              { name: row.hostname, path: `/labs/audits/${row.slug}` },
            ]),
          ),
        }}
      />
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Open Audit
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {row.hostname}
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          Score <span className="font-semibold text-fg">{row.score}</span>/100 ·{" "}
          {row.source} · {new Date(row.createdAt).toLocaleString()}
          {row.durationMs != null ? ` · ${row.durationMs}ms` : ""}
        </p>
        {row.url ? (
          <p className="mt-2 break-all text-sm text-fg-muted">{row.url}</p>
        ) : null}
        <p className="mt-4 text-sm text-fg-muted">
          Opt-in public snapshot from free diagnostics. Not a full MoneyGap Engine™
          report. Impact claims elsewhere are AI Estimates only.
        </p>

        <ul className="mt-8 space-y-3 border-t border-border pt-8">
          {findings.map((f) => (
            <li key={f.id} className="text-sm">
              <span className="font-medium text-fg">
                [{f.severity}] {f.title}
              </span>
              <span className="mt-0.5 block text-fg-muted">{f.detail}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={`/api/public/audits/${row.slug}/pdf`}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-[0.95rem] font-medium text-accent-fg transition hover:brightness-110"
          >
            Download PDF
          </a>
          <StartFreeButton label="Start Free Trial" size="lg" />
          <Link
            href="/labs"
            className="inline-flex h-12 items-center rounded-xl border border-border px-5 text-sm font-medium text-fg-muted hover:text-fg"
          >
            Back to Labs
          </Link>
        </div>
      </article>
    </>
  );
}
