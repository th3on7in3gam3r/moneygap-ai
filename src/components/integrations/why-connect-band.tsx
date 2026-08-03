import Link from "next/link";

export function WhyConnectBand() {
  return (
    <section
      aria-labelledby="why-connect-heading"
      className="rounded-2xl border border-border bg-bg-elevated px-5 py-5 sm:px-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
        Purpose
      </p>
      <h2
        id="why-connect-heading"
        className="mt-2 font-display text-xl font-semibold tracking-tight text-fg"
      >
        Why connect
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">
        Connect tools so MoneyGap can understand your growth stack beyond the
        public website — analytics, CRM, email, CMS, payments, and code.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-fg-muted">
        <li className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>
            Improves Integration Health and the Connection Map for this workspace.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>
            <span className="font-medium text-fg">GitHub</span> unlocks Developer
            Mode™ — Project Memory™, IDE prompts, and draft PRs only (never
            auto-merge to main).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>
            Soft-fail: Hub issues never block reports. Connections do{" "}
            <span className="font-medium text-fg">not</span> rewrite MoneyGap
            Score™. Most connectors stage credentials today; Engine enrichment
            ships incrementally. No auto-publish or auto-email.
          </span>
        </li>
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/docs/integrations" className="font-medium text-accent hover:underline">
          Read Integrations docs
        </Link>
      </p>
    </section>
  );
}
