import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description:
    "Terms governing use of MoneyGap AI, including accounts, subscriptions, and acceptable use.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms govern access to MoneyGap AI. Engage counsel to finalize jurisdiction-specific language for your entity."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Terms", path: "/terms" },
      ]}
      primaryCta={{ label: "Contact us", href: "/contact" }}
    >
      <div className="max-w-3xl space-y-6 text-base leading-relaxed text-fg-muted">
        <p>
          <strong className="text-fg">Last updated:</strong>{" "}
          {new Date().toISOString().slice(0, 10)}
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Agreement</h2>
        <p>
          By creating an account or using MoneyGap AI, you agree to these Terms
          and our Privacy Policy. If you use MoneyGap AI for an organization, you
          represent that you have authority to bind that organization.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">The service</h2>
        <p>
          MoneyGap AI provides analysis, recommendations, and related tools on an
          “as available” basis. Insights, scores, and revenue estimates are
          informational and may include AI-assisted outputs that require human
          review. We do not guarantee specific business results.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Accounts & billing</h2>
        <p>
          You are responsible for account credentials and activity. Paid plans
          renew according to the interval you select until canceled. Fees are
          processed by our payment provider and are generally non-refundable
          except where required by law.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Acceptable use</h2>
        <p>
          Do not misuse the service, attempt unauthorized access, scrape in ways
          that harm the platform, or use MoneyGap AI to violate law or third-party
          rights.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Contact</h2>
        <p>
          Questions:{" "}
          <a href="mailto:support@moneygap-ai.com" className="text-accent hover:underline">
            support@moneygap-ai.com
          </a>
        </p>
        <p className="text-sm">
          This page is a production-ready legal scaffold and should be reviewed by
          qualified counsel before use as final terms.
        </p>
      </div>
    </MarketingPageShell>
  );
}
