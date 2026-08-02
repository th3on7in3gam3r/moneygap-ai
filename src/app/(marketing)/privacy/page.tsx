import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How MoneyGap AI collects, uses, and protects information when you use our Growth Operating System™.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="We take privacy seriously. This page summarizes how MoneyGap AI handles information. For production legal review, engage counsel to finalize jurisdiction-specific terms."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Privacy", path: "/privacy" },
      ]}
      primaryCta={{ label: "Contact us", href: "/contact" }}
    >
      <div className="prose-about max-w-3xl space-y-6 text-base leading-relaxed text-fg-muted">
        <p>
          <strong className="text-fg">Last updated:</strong>{" "}
          {new Date().toISOString().slice(0, 10)}
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Overview</h2>
        <p>
          MoneyGap AI (“we”) provides an AI-powered Growth Operating System™. We
          collect account information (such as email via our auth provider),
          workspace and website analysis data you submit, usage metrics needed to
          operate the service, and billing details processed by our payment
          provider when you subscribe.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">How we use data</h2>
        <p>
          We use data to authenticate users, run analyses, generate
          recommendations, improve the product, provide support, and process
          subscriptions. AI features may send relevant content to model providers
          under their respective terms.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Sharing</h2>
        <p>
          We use trusted processors (hosting, database, authentication, payments,
          email, AI APIs). We do not sell personal information. We may disclose
          information if required by law.
        </p>
        <h2 className="font-display text-xl font-semibold text-fg">Your choices</h2>
        <p>
          Contact{" "}
          <a href="mailto:support@moneygap-ai.com" className="text-accent hover:underline">
            support@moneygap-ai.com
          </a>{" "}
          to request access, correction, or deletion of account data subject to
          legal and operational limits.
        </p>
        <p className="text-sm">
          This policy is a production-ready scaffold and should be reviewed by
          qualified counsel before relying on it as final legal advice.
        </p>
      </div>
    </MarketingPageShell>
  );
}
