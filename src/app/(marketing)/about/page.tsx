import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Why MoneyGap AI exists.",
};

export default function AboutPage() {
  return (
    <section className="bg-hero py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">About</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Revenue is lost in the gaps between intention and execution.
        </h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-fg-muted">
          <p>
            MoneyGap AI started from a simple observation: most teams know their conversion rate,
            but few can point to the exact dollars leaking from checkout friction, pricing
            presentation, or messaging that fails high-intent traffic.
          </p>
          <p>
            We built a premium operating layer first — authentication, workspaces, analytics,
            reports, and Money Gap components — so that every future AI capability lands inside a
            product customers already trust.
          </p>
          <p>
            Today that foundation powers AI website analysis, the Money Gap
            Engine, competitor intelligence, Growth Copilot™, Predictive
            Intelligence™, and Stripe-ready subscriptions — one operating system
            for recovering revenue.
          </p>
        </div>
      </div>
    </section>
  );
}
