import type { Metadata } from "next";
import { CheckCircle2, LineChart, ScanSearch, Sparkles } from "lucide-react";
import Link from "next/link";
import { StartFreeButton } from "@/components/auth-buttons";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqBlock } from "@/components/marketing/faq-block";
import { SandboxTerminal } from "@/components/marketing/sandbox-terminal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { MoneyGapCard } from "@/components/money-gap";
import { Button } from "@/components/ui/button";
import { SAMPLE_GAPS } from "@/lib/sample-data";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
    path: "/",
  }),
  title: { absolute: SITE_DEFAULT_TITLE },
};

const HOME_FAQ = [
  {
    question: "What is a Money Gap™?",
    answer:
      "A Money Gap™ is a concrete miss on your site — visibility, conversion, trust, content, or AI discovery — that leaves revenue on the table. MoneyGap AI surfaces them with an AI Estimate of impact and a Fix Path™ you can implement with human review.",
  },
  {
    question: "Is MoneyGap AI a developer-friendly conversion tool?",
    answer:
      "Yes. MoneyGap AI is built as a developer-friendly conversion tool: run a free live diagnostic in the homepage terminal or via npx moneygap-scan, then unlock Fix Paths™ and the MoneyGap Engine™ to close conversion and growth leaks with human review.",
  },
  {
    question: "What is a codebase growth audit?",
    answer:
      "A codebase growth audit looks at how your site’s technical surface — crawlability, schema, performance signals, routing, and conversion paths — quietly caps revenue. MoneyGap AI pairs that audit with Opportunity Index™ scoring and Fix Paths™ so engineering and growth share one backlog.",
  },
  {
    question: "What's the free homepage sandbox vs a full scan?",
    answer:
      "The free sandbox (and npx moneygap-scan) runs lightweight crawlability, schema, and performance-signal checks with no account. A full MoneyGap Engine™ scan after you Start free adds deeper scoring, Opportunity Index™, and Fix Paths™ in your dashboard.",
  },
  {
    question: "Are revenue estimates guaranteed?",
    answer:
      "No. Opportunity figures are AI Estimates / Estimated Opportunity — decision aids, not guarantees of financial results. Always review findings before acting.",
  },
  {
    question: "How does MoneyGap AI work?",
    answer:
      "Analyze a public site, review Money Gaps™ ranked by Opportunity Index™, choose a Fix Path™, then monitor and re-scan. Growth Academy™ and Copilot help you learn and prioritize along the way.",
  },
  {
    question: "Who is MoneyGap AI for?",
    answer:
      "Founders, growth teams, agencies, and operators who want a Growth Operating System™ — not a one-off audit PDF.",
  },
  {
    question:
      "How can a mobile checkout bug cost thousands per month?",
    answer:
      "When guest checkout routing breaks on mobile only, traffic can look fine while completions collapse. See our composite engineering post-mortem on a reconstructed ~$18k/month Estimated Opportunity: /academy/mobile-guest-checkout-routing-18k — figures are decision aids, not guarantees.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <p className="animate-rise font-display text-5xl font-semibold tracking-tight text-fg sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]">
              MoneyGap<span className="text-accent"> AI</span>
            </p>
            <h1 className="animate-rise-delay-1 mt-5 max-w-xl text-2xl font-medium leading-snug tracking-tight text-fg sm:text-3xl">
              Find the revenue your website is leaving on the table.
            </h1>
            <p className="animate-rise-delay-2 mt-5 max-w-lg text-base leading-relaxed text-fg-muted sm:text-lg">
              Run a free live diagnostic in the terminal (same engine as{" "}
              <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-sm text-fg">
                npx moneygap-scan
              </code>
              ) — then Start Free Trial to unlock Fix Paths™.
            </p>
            <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <StartFreeButton label="Start Free Trial" size="lg" />
              <Button href="/features" variant="secondary" size="lg">
                Explore features
              </Button>
            </div>
          </div>

          <div className="animate-rise-delay-2">
            <SandboxTerminal />
          </div>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="What is MoneyGap AI?"
            title="A Growth Operating System™ — not another audit PDF."
            description="MoneyGap AI analyzes public websites, surfaces Money Gaps™ across SEO, conversion, trust, content, and AI visibility, then helps you prioritize and execute with Fix Paths™, Copilot, and Growth Academy™."
          />
          <p className="mt-6 max-w-2xl text-sm text-fg-muted">
            Teams use it as a developer-friendly conversion tool and a codebase
            growth audit — from the free CLI sandbox to full Fix Paths™. Learn more
            on{" "}
            <Link href="/about" className="text-accent hover:underline">
              About
            </Link>{" "}
            and{" "}
            <Link href="/features" className="text-accent hover:underline">
              Features
            </Link>
            .
          </p>
        </div>
      </section>

      <section
        id="product"
        className="border-t border-border bg-bg-elevated py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="Analyze. Prioritize. Close the gap."
            description="Three steps from URL to execution — framed in business impact, not vanity metrics."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ScanSearch,
                title: "1. Analyze your site",
                body: "Crawl and score the property. MoneyGap Engine™ finds gaps across modules tied to traffic → leads → revenue.",
              },
              {
                icon: LineChart,
                title: "2. Prioritize with Opportunity Index™",
                body: "Every finding carries confidence, estimated impact (AI Estimate), and priority so roadmap debates stay grounded.",
              },
              {
                icon: Sparkles,
                title: "3. Ship a Fix Path™",
                body: "Choose how to execute — Action Center, checklist, Developer Mode, or Copilot — then re-scan and measure.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-bg p-6"
              >
                <item.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-display text-xl font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Money Gap™"
            title="Hidden revenue leaks — made visible."
            description="A Money Gap™ is a concrete miss: weak CTA, thin trust, crawl blockers, missing buyer-intent pages, or AI discoverability holes. We name it, estimate impact, and give you a Fix Path™."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {SAMPLE_GAPS.slice(0, 4).map((gap) => (
              <MoneyGapCard key={gap.id} {...gap} />
            ))}
          </div>
          <p className="mt-4 text-xs text-fg-subtle">
            Illustrative examples — not live workspace data.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Core Growth Scores™"
            title="Health and opportunity — clearly separated."
            description="MoneyGap Score™ shows uncaptured opportunity (higher = more work left). Crawlability Score™ and Technical SEO health scores run the other way — higher means healthier discovery for search and AI systems."
          />
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/features" className="text-accent hover:underline">
              See all scores & engines →
            </Link>
            <Link href="/security" className="text-fg-muted hover:text-fg">
              Security practices
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="AI Growth Copilot™"
              title="Ask what to fix next — get a path, not a wall of text."
              description="Copilot navigates Money Gaps™, reports, and Fix Paths™ with transparent estimates and human-in-the-loop execution."
            />
          </div>
          <div>
            <SectionHeading
              eyebrow="Fix Path™"
              title="From insight to implementation."
              description="Every priority opportunity can ship via Action Center, checklists, Developer Mode, automation, or advisor guidance — with verification steps."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Growth Academy™"
            title="Education that maps to the gaps you find."
            description="Playbooks for SEO, conversion, trust, and AI visibility — linked from the product so learning closes loops instead of floating as a blog."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/academy" size="lg">
              Open Growth Academy
            </Button>
            <Button href="/integrations" variant="secondary" size="lg">
              Integrations
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Pricing & demo"
            title="Start free. Upgrade when capture compounds."
            description="Explore Free, then scale with Growth, Professional, Agency, or Enterprise. Soft plan switching in Billing; Checkout when Stripe is configured."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <StartFreeButton label="Start free analysis" size="lg" />
            <Button href="/pricing" variant="secondary" size="lg">
              View pricing
            </Button>
            <Button href="/contact" variant="ghost" size="lg">
              Talk to sales
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Trust"
            title="Built for operators who need transparency."
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Estimates labeled AI Estimate — never presented as guarantees",
              "Human review before publishing or auto-acting on recommendations",
              "Auth via Clerk; billing via Stripe when enabled",
              "Crawlability & SEO scanners cite evidence, not invented rankings",
              "Privacy, Terms, and Security pages for launch readiness",
              "Responsible disclosure contact on /security",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-fg-muted"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-fg-muted">
            Prefer a quick scan in the browser? The{" "}
            <Link href="/extension" className="font-medium text-accent underline-offset-2 hover:underline">
              MoneyGap AI Chrome extension
            </Link>{" "}
            is Coming Soon — join the waitlist.
          </p>
        </div>
      </section>

      <section id="faq" className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FaqBlock items={HOME_FAQ} />
        </div>
      </section>

      <CtaBand
        title="Your revenue leaks have a number. Make it smaller."
        description="Join the workspace, analyze your site, and see every opportunity framed in dollars — from your reports, with Fix Paths™ you can ship."
        primaryLabel="Create your account"
        secondaryHref="/pricing"
        secondaryLabel="View pricing"
      />
    </>
  );
}
