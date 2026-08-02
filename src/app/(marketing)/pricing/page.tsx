import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { StartFreeButton } from "@/components/auth-buttons";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqBlock } from "@/components/marketing/faq-block";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG } from "@/lib/billing/catalog";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "MoneyGap AI plans — Free through Enterprise. Compare features, start a trial path, or contact sales for Agency and Enterprise.",
  path: "/pricing",
});

const HIGHLIGHT = "growth";

const FEATURE_BLURBS: Record<string, string[]> = {
  free: ["2 analyses / month", "Core Money Gap report", "Upgrade prompts when you go deeper"],
  starter: ["10 analyses / month", "Light Monitor schedules", "2 team seats"],
  growth: [
    "Full Engine + Advisor + Action Center",
    "Competitive Intelligence™",
    "40 analyses / month",
  ],
  professional: [
    "Higher AI & report limits",
    "Scheduled client reports",
    "Up to 3 clients",
  ],
  agency: [
    "Agency workspace + clients",
    "White-label reports",
    "50 clients · 15 seats",
  ],
  enterprise: [
    "Highest caps",
    "API access reserved",
    "Dedicated success path",
  ],
};

const PRICING_FAQ = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes — start on Free to run analyses and see Money Gaps™. Upgrade when you need higher limits, Monitor, agency clients, or Enterprise support.",
  },
  {
    question: "How does billing work?",
    answer:
      "Soft plan switching is available in Billing for workspace plan selection. Stripe Checkout activates paid subscriptions when billing keys are configured.",
  },
  {
    question: "Can agencies white-label reports?",
    answer:
      "Agency and higher plans include agency workspace tooling and white-label report options. Contact sales for portfolio needs.",
  },
  {
    question: "Who should choose Enterprise?",
    answer:
      "Teams that need highest caps, reserved API access, and a dedicated success path. Use Contact → Sales or email hello@moneygap-ai.com.",
  },
];

export default function PricingPage() {
  const plans = PLAN_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
    price:
      p.monthlyPriceCents <= 0
        ? "$0"
        : `$${(p.monthlyPriceCents / 100).toFixed(0)}`,
    blurb: p.description,
    features:
      FEATURE_BLURBS[p.id] ??
      p.features.slice(0, 4).map((f) => f.replace(/_/g, " ")),
    cta:
      p.id === "enterprise"
        ? "Talk to sales"
        : p.id === "free"
          ? "Start free"
          : `Start ${p.name}`,
    highlighted: p.id === HIGHLIGHT,
    enterprise: p.id === "enterprise",
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Pricing", path: "/pricing" },
            ]),
          ),
        }}
      />
      <section className="bg-hero py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Pricing that scales with capture.
            </h1>
            <p className="mt-4 text-fg-muted">
              Start free. Upgrade when Opportunity Index™ work compounds. Soft
              plan switching in Billing; Stripe Checkout when billing is
              configured.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlighted
                    ? "border-accent bg-bg-elevated shadow-[var(--shadow)]"
                    : "border-border bg-bg-elevated/80"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-fg">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-sm text-fg-muted">{plan.blurb}</p>
                <p className="mt-6 font-display text-4xl font-semibold tracking-tight">
                  {plan.price}
                  <span className="text-base font-medium text-fg-subtle">/mo</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-fg">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {plan.enterprise ? (
                    <Button href="/contact" variant="secondary" className="w-full">
                      {plan.cta}
                    </Button>
                  ) : plan.highlighted ? (
                    <div className="[&_button]:h-11 [&_button]:w-full [&_button]:justify-center">
                      <StartFreeButton label={plan.cta} />
                    </div>
                  ) : (
                    <Button href="/sign-up" variant="secondary" className="w-full">
                      {plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-fg-muted">
            Feature comparison details live in each plan card above. Need a custom
            portfolio?{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Contact Enterprise sales
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FaqBlock items={PRICING_FAQ} />
        </div>
      </section>

      <CtaBand
        title="Start capturing the gaps that matter."
        description="Create a free workspace, run an analysis, and upgrade when you need more seats, clients, or caps."
        primaryLabel="Start free"
        secondaryHref="/contact"
        secondaryLabel="Talk to sales"
      />
    </>
  );
}
