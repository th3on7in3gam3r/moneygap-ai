import type { Metadata } from "next";
import { Check } from "lucide-react";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG } from "@/lib/billing/catalog";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans for teams closing revenue gaps.",
};

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
        ? "Talk to us"
        : p.id === "free"
          ? "Start free"
          : `Start ${p.name}`,
    highlighted: p.id === HIGHLIGHT,
  }));

  return (
    <section className="bg-hero py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Pricing that scales with capture.
          </p>
          <p className="mt-4 text-fg-muted">
            Explore Free today. Soft plan switching is available in Billing;
            Stripe Checkout activates when billing keys are configured.
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
                {plan.highlighted ? (
                  <div className="[&_button]:w-full [&_button]:justify-center [&_button]:h-11">
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
      </div>
    </section>
  );
}
