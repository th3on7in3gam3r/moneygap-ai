import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Security",
  description:
    "MoneyGap AI security practices — authentication, encryption, infrastructure overview, and responsible disclosure.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <MarketingPageShell
      eyebrow="Trust"
      title="Security at MoneyGap AI"
      description="How we protect accounts, analysis data, and the systems that run the Growth Operating System™ — with honest scope and a clear disclosure path."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Security", path: "/security" },
      ]}
      primaryCta={{ label: "Report a concern", href: "/contact" }}
    >
      <div className="max-w-3xl space-y-8 text-base leading-relaxed text-fg-muted">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Data protection
          </h2>
          <p>
            Workspace data (websites, analyses, reports, findings) is stored in a
            managed database with access restricted to authenticated application
            paths. We separate customer workspaces and require login for
            dashboard surfaces.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Encryption
          </h2>
          <p>
            Traffic to MoneyGap AI is served over HTTPS/TLS. Data at rest is
            protected by our infrastructure providers’ encryption capabilities.
            Secrets and API keys are stored as environment configuration — not
            in client bundles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Authentication
          </h2>
          <p>
            User authentication is handled by Clerk. We rely on session and
            identity controls from that provider, including sign-in and sign-up
            flows. Protect your account credentials and invite only trusted
            teammates.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Infrastructure overview
          </h2>
          <p>
            The application is deployed on modern cloud hosting (Vercel-class
            compute) with a managed Postgres database (Neon-class). Payments,
            when enabled, are processed by Stripe. Crawl and AI features may call
            specialized providers under API keys you configure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Security practices
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Authenticated access to dashboard and private APIs</li>
            <li>Robots and crawl controls that keep private surfaces noindex</li>
            <li>Least-privilege secrets via environment configuration</li>
            <li>Operational logging for abuse and incident investigation</li>
            <li>
              Product honesty: we do not invent Search Console or analytics
              findings when integrations are unavailable
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Responsible disclosure
          </h2>
          <p>
            If you believe you have found a security vulnerability, email{" "}
            <a
              href="mailto:support@moneygap-ai.com"
              className="text-accent hover:underline"
            >
              support@moneygap-ai.com
            </a>{" "}
            with details and steps to reproduce. Please allow reasonable time for
            investigation before public disclosure. Do not access data that is
            not yours or disrupt production systems.
          </p>
        </section>

        <p className="text-sm">
          Related:{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/contact" className="text-accent hover:underline">
            Contact
          </Link>
        </p>
      </div>
    </MarketingPageShell>
  );
}
