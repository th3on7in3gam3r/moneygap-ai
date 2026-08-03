import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StartFreeButton } from "@/components/auth-buttons";
import { FaqBlock } from "@/components/marketing/faq-block";
import { Button } from "@/components/ui/button";
import {
  listPublicDocs,
  publicDocsByCategory,
  type PublicDocEntry,
} from "@/lib/docs";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqPageJsonLd,
  jsonLdScript,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Documentation",
  description:
    "MoneyGap AI documentation — getting started, MoneyGap Score™, Fix Paths™, Crawlability, Privacy, integrations, and Growth Academy™.",
  path: "/docs",
});

const DOCS_FAQ = [
  {
    question: "Where do I run my first analysis?",
    answer:
      "Sign up, open the dashboard, and analyze a public website URL. Your Growth Report and Money Gaps™ appear when the pipeline completes.",
  },
  {
    question: "Is there a public Help Center?",
    answer:
      "This Documentation hub is the public help center. Signed-in teams also get Documentation Center™ in the dashboard, which opens the same guides.",
  },
  {
    question: "Are opportunity dollar figures guaranteed?",
    answer:
      "No. Impact numbers are AI Estimates — directional signals for prioritization. Always keep a human in the loop before publishing or auto-acting.",
  },
  {
    question: "Where do I change cookie preferences?",
    answer:
      "Use Privacy preferences in the site footer to reopen Smart Consent™, or open Settings → Privacy when signed in.",
  },
];

function GuideLink({ doc, featured = false }: { doc: PublicDocEntry; featured?: boolean }) {
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className={
        featured
          ? "group flex flex-col justify-between border-b border-border py-5 transition first:pt-0 last:border-b-0 hover:border-accent/40 sm:py-6"
          : "group block border-b border-border py-4 last:border-b-0"
      }
    >
      <span className="font-display text-lg font-semibold tracking-tight text-fg transition group-hover:text-accent">
        {doc.title}
      </span>
      <span className="mt-1.5 block text-sm leading-relaxed text-fg-muted">
        {doc.summary}
      </span>
      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        Read guide
        <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function DocsMarketingPage() {
  const startHere = listPublicDocs("start")[0];
  const groups = publicDocsByCategory().filter((g) => g.category !== "start");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Docs", path: "/docs" },
            ]),
            faqPageJsonLd(DOCS_FAQ),
          ]),
        }}
      />

      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
        <div className="relative mx-auto max-w-3xl px-0 pb-2 pt-2 lg:pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Documentation
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            MoneyGap AI
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Guides for closing gaps faster — analyses, scores, Fix Paths™, privacy,
            and Academy playbooks. Start here, then open the dashboard when you are
            ready to scan.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {startHere ? (
              <Button href={`/docs/${startHere.slug}`} size="lg">
                Start with Getting started
              </Button>
            ) : null}
            <Button href="/dashboard" variant="secondary" size="lg">
              Open dashboard
            </Button>
            <StartFreeButton label="Start free" size="lg" />
          </div>
        </div>
      </section>

      {startHere ? (
        <section className="mt-10 border-t border-border pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Start here
          </p>
          <GuideLink doc={startHere} featured />
        </section>
      ) : null}

      <div className="mt-12 space-y-12">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
              {group.label}
            </h2>
            <div className="mt-2">
              {group.docs.map((doc) => (
                <GuideLink key={doc.slug} doc={doc} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14">
        <FaqBlock items={DOCS_FAQ} title="Docs FAQ" />
      </div>

      <section className="relative mt-14 overflow-hidden rounded-[1.5rem] border border-border bg-hero px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <h2 className="relative font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Ready to find your Money Gaps™?
        </h2>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">
          Analyze a public site, review AI Estimates with a human in the loop, and
          ship Fix Paths™ you can verify.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <StartFreeButton label="Start free analysis" size="lg" />
          <Button href="/academy" variant="secondary" size="lg">
            Growth Academy™
          </Button>
          <Button href="/dashboard" variant="secondary" size="lg">
            Open dashboard
          </Button>
        </div>
      </section>

      <p className="mt-10 text-sm text-fg-subtle">
        <Link href="/" className="hover:text-fg">
          ← Home
        </Link>
        {" · "}
        <Link href="/features" className="hover:text-fg">
          Features
        </Link>
        {" · "}
        <Link href="/academy" className="hover:text-fg">
          Growth Academy
        </Link>
      </p>
    </>
  );
}
