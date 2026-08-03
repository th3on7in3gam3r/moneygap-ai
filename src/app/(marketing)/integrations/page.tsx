import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Integrations",
  description:
    "Connect MoneyGap AI to your growth stack — Hub health, GitHub Developer Mode™, soft-fail sync. Credentials stay private to your workspace.",
  path: "/integrations",
});

export default function IntegrationsMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Integrations"
      title="Connect the tools you already use"
      description="MoneyGap Integration Hub connects analysis and Fix Paths™ to the rest of your growth stack — beyond the public website."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Integrations", path: "/integrations" },
      ]}
      primaryCta={{ label: "Open Integrations", href: "/dashboard/integrations" }}
    >
      <div className="max-w-2xl space-y-6 text-base leading-relaxed text-fg-muted">
        <p>
          Wire up providers from the dashboard Integration Hub after you sign in.
          Public overview pages stay indexable; credentials and connections remain
          private to your workspace.
        </p>
        <section>
          <h2 className="font-display text-xl font-semibold text-fg">
            Why connect
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Help MoneyGap understand your growth stack (analytics, CRM, email,
              CMS, payments, code) for Integration Health and the Connection Map.
            </li>
            <li>
              <span className="font-medium text-fg">GitHub</span> unlocks Developer
              Mode™ — Project Memory™, IDE prompts, and draft PRs only (never
              auto-merge to main).
            </li>
            <li>
              Soft-fail: Hub issues never block reports. Connections do not rewrite
              MoneyGap Score™. Most connectors stage credentials today; Engine
              enrichment ships incrementally. No auto-publish or auto-email.
            </li>
          </ul>
        </section>
        <p>
          Full guide:{" "}
          <Link href="/docs/integrations" className="text-accent hover:underline">
            Integrations documentation
          </Link>
          .
        </p>
      </div>
    </MarketingPageShell>
  );
}
