import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Contact",
  description:
    "Contact MoneyGap AI for product questions, support, and partnership inquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact"
      title="We're here to help you close the gaps."
      description="Reach the MoneyGap AI team for product support, billing questions, or Growth Stack partnerships."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]}
      primaryCta={{ label: "Start free analysis", signUp: true }}
    >
      <div className="max-w-2xl space-y-6 text-base leading-relaxed text-fg-muted">
        <p>
          <span className="font-medium text-fg">Product & support</span>
          <br />
          Email{" "}
          <a
            href="mailto:support@moneygap-ai.com"
            className="text-accent hover:underline"
          >
            support@moneygap-ai.com
          </a>
        </p>
        <p>
          <span className="font-medium text-fg">Partnerships & Growth Stack</span>
          <br />
          Email{" "}
          <a
            href="mailto:hello@moneygap-ai.com"
            className="text-accent hover:underline"
          >
            hello@moneygap-ai.com
          </a>
        </p>
        <p className="text-sm">
          Prefer self-serve? Open the dashboard after you sign up, or browse{" "}
          <a href="/academy" className="text-accent hover:underline">
            Growth Academy™
          </a>{" "}
          for playbooks.
        </p>
      </div>
    </MarketingPageShell>
  );
}
