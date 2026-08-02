import Link from "next/link";
import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact MoneyGap AI",
  description:
    "Contact MoneyGap AI for product support, sales, or partnership inquiries. We typically reply within 1–2 business days.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact"
      title="We're here to help you close the gaps."
      description="Reach the MoneyGap AI team for product support, sales, or Growth Stack partnerships. Use the form or email us directly."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]}
      primaryCta={{ label: "Start free analysis", signUp: true }}
    >
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="font-display text-xl font-semibold text-fg">
            Send a message
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Choose Support, Sales, or Partnership. We typically respond within{" "}
            <strong className="font-medium text-fg">1–2 business days</strong>.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
        <div className="space-y-6 text-sm leading-relaxed text-fg-muted">
          <div>
            <p className="font-medium text-fg">Product & support</p>
            <a
              href="mailto:support@moneygap-ai.com"
              className="text-accent hover:underline"
            >
              support@moneygap-ai.com
            </a>
          </div>
          <div>
            <p className="font-medium text-fg">Sales & Enterprise</p>
            <a
              href="mailto:hello@moneygap-ai.com"
              className="text-accent hover:underline"
            >
              hello@moneygap-ai.com
            </a>
          </div>
          <div>
            <p className="font-medium text-fg">Partnerships & Growth Stack</p>
            <a
              href="mailto:hello@moneygap-ai.com"
              className="text-accent hover:underline"
            >
              hello@moneygap-ai.com
            </a>
          </div>
          <div>
            <p className="font-medium text-fg">Helpful links</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/docs" className="text-accent hover:underline">
                  Documentation / Help Center
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-accent hover:underline">
                  Product FAQ (homepage)
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-accent hover:underline">
                  Security & disclosure
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-accent hover:underline">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <p className="rounded-xl border border-border bg-bg px-4 py-3 text-fg-muted">
            MoneyGap AI is built for transparency: estimates are labeled AI
            Estimate, and we do not invent rankings or crawl data we cannot
            verify.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
