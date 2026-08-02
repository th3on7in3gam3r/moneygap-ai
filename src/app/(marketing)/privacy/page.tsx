import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How MoneyGap AI collects, uses, retains, and protects account, analysis, integration, and AI processing data.",
  path: "/privacy",
});

const UPDATED = "2026-08-02";

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="This policy describes how MoneyGap AI handles information. Have counsel review jurisdiction-specific requirements before relying on this page as final production legal text."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Privacy", path: "/privacy" },
      ]}
      primaryCta={{ label: "Contact us", href: "/contact" }}
    >
      <div className="max-w-3xl space-y-8 text-base leading-relaxed text-fg-muted">
        <p>
          <strong className="text-fg">Last updated:</strong> {UPDATED}
        </p>
        <p className="rounded-xl border border-border bg-bg px-4 py-3 text-sm">
          Counsel review recommended before production launch in your markets.
        </p>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Information we collect
          </h2>
          <p>
            We collect information you provide, information generated when you
            use the service, and information from connected third parties when
            you authorize integrations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Account information
          </h2>
          <p>
            Authentication is provided by Clerk. We receive identifiers such as
            user ID, email, and profile fields needed to operate workspaces,
            seats, and access control. Billing identity may be linked when you
            subscribe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Website analysis data
          </h2>
          <p>
            When you submit a URL for analysis, we crawl and process publicly
            available pages and related signals (for example titles, structure,
            links, and site files such as robots.txt or sitemaps). Analysis
            outputs — Money Gaps™, scores, reports, and Fix Paths™ — are stored
            in your workspace.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Integration data
          </h2>
          <p>
            If you connect integrations (for example GitHub, Stripe, or HubSpot
            where available), we process tokens and snapshots required to
            provide those features. We do not invent integration findings when a
            connector is disconnected or unavailable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            AI processing
          </h2>
          <p>
            Certain features send relevant content (such as crawl corpus excerpts
            or prompts) to model providers to generate recommendations,
            summaries, and drafts. Outputs are decision aids. Opportunity figures
            are AI Estimates — not guarantees. Do not submit secrets you are not
            authorized to process.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">Analytics</h2>
          <p>
            We may collect product analytics and operational logs (feature usage,
            errors, performance) to operate, secure, and improve MoneyGap AI.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">Cookies</h2>
          <p>
            We use cookies and similar technologies for authentication sessions,
            preferences (such as theme), and essential application function.
            Third-party auth and billing providers may set their own cookies
            subject to their policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            How we use data
          </h2>
          <p>
            We use data to authenticate users, run analyses, generate
            recommendations, operate billing, provide support, prevent abuse,
            and improve the product. We do not sell personal information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Data retention
          </h2>
          <p>
            We retain account and workspace data while your account is active and
            as needed for legitimate business purposes (security, billing
            records, legal obligations). You may request deletion of account data
            subject to those obligations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Security practices
          </h2>
          <p>
            We use industry-standard providers for hosting, database, and auth.
            Access is authenticated; secrets are stored as environment
            configuration. See our{" "}
            <a href="/security" className="text-accent hover:underline">
              Security
            </a>{" "}
            page for a higher-level overview.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Third-party services
          </h2>
          <p>
            We rely on processors such as Clerk (auth), Stripe (payments when
            enabled), hosting/database providers, crawl providers when
            configured, and AI model providers. Their processing is governed by
            their terms and our agreements with them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Your rights
          </h2>
          <p>
            Depending on your location, you may have rights to access, correct,
            export, or delete personal data, or to object to certain processing.
            Contact us to exercise these rights. We may verify your identity
            before fulfilling requests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Account deletion
          </h2>
          <p>
            You may request account and workspace deletion by contacting{" "}
            <a
              href="mailto:support@moneygap-ai.com"
              className="text-accent hover:underline"
            >
              support@moneygap-ai.com
            </a>
            . Some records may be retained where required for law, dispute
            resolution, or security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">Contact</h2>
          <p>
            Privacy questions:{" "}
            <a
              href="mailto:support@moneygap-ai.com"
              className="text-accent hover:underline"
            >
              support@moneygap-ai.com
            </a>{" "}
            or our{" "}
            <a href="/contact" className="text-accent hover:underline">
              Contact
            </a>{" "}
            page.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
