import Link from "next/link";
import { FaqBlock } from "@/components/marketing/faq-block";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Documentation",
  description:
    "Getting started with MoneyGap AI — analyses, Fix Paths™, integrations, AI capabilities, API overview, and Growth Academy™.",
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
      "This page is the public documentation hub. Signed-in teams also get product surfaces in the dashboard. Growth Academy™ covers educational playbooks.",
  },
];

export default function DocsMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Documentation"
      title="Guides for closing gaps faster"
      description="Public overview of MoneyGap AI. Use this hub to get oriented, then dive into the product and Growth Academy™."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
      ]}
      primaryCta={{ label: "Open dashboard", href: "/dashboard" }}
    >
      <div className="space-y-12">
        <section>
          <h2 className="font-display text-xl font-semibold text-fg">
            Getting started
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-fg-muted">
            <li>Create an account and workspace.</li>
            <li>Analyze a public website URL.</li>
            <li>Review MoneyGap Score™, category scores, and opportunities.</li>
            <li>Open a Fix Path™ and verify the change.</li>
            <li>Re-scan and watch deltas over time.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-fg">Features</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Full capability map — Engine, Crawlability Score™, Copilot, Trust
            Engine™, Academy, and more — on{" "}
            <Link href="/features" className="text-accent hover:underline">
              Features
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-fg">
            Integrations
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Learn how MoneyGap connects to the rest of your stack on{" "}
            <Link href="/integrations" className="text-accent hover:underline">
              Integrations
            </Link>
            . Unavailable connectors never invent findings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-fg">
            API (future)
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Public API access is reserved on higher plans. Product overview:{" "}
            <Link href="/api" className="text-accent hover:underline">
              API
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-fg">
            AI capabilities
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Copilot, Engine modules, metadata drafts, and estimates are AI-assisted.
            Always treat opportunity numbers as AI Estimates and keep a human in
            the loop before publishing or auto-acting.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-fg">
            Growth Academy™
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Educational playbooks that map to Fix Paths™:{" "}
            <Link href="/academy" className="text-accent hover:underline">
              /academy
            </Link>
            .
          </p>
        </section>

        <FaqBlock items={DOCS_FAQ} title="Docs FAQ" />
      </div>
    </MarketingPageShell>
  );
}
