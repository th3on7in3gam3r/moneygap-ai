import type { Metadata } from "next";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About MoneyGap AI",
  description:
    "MoneyGap AI is an AI-powered Growth Operating System™ that finds Money Gaps™ — hidden revenue leaks and growth opportunities — then helps you prioritize, fix, and measure them.",
};

const OWNER_QUESTIONS = [
  "Where am I losing opportunities?",
  "Why is it happening?",
  "What should I fix first?",
  "How much could this impact my business?",
  "How do I actually fix it?",
] as const;

const GAP_EXAMPLES = [
  "A missing call-to-action",
  "A slow-loading page",
  "Poor search visibility",
  "Weak trust signals",
  "Missed backlinks",
  "Incomplete content",
  "Broken customer journeys",
  "Untapped automation",
] as const;

const OPPORTUNITY_DOMAINS = [
  "Revenue Growth",
  "Search Visibility",
  "Technical SEO",
  "Website Performance",
  "Content Strategy",
  "Conversion Optimization",
  "Trust & Credibility",
  "Backlink Health",
  "Competitor Positioning",
  "Customer Experience",
  "Automation Opportunities",
  "AI Visibility",
  "Digital Marketing",
  "Team Collaboration",
] as const;

const ACTION_QUESTIONS = [
  {
    title: "What was found?",
    body: "A clear description of the gap, grounded in evidence from your site and stack.",
  },
  {
    title: "Why does it matter?",
    body: "Business context — how the issue affects customers, visibility, or revenue.",
  },
  {
    title: "How much opportunity could it represent?",
    body: "Impact framing with transparent assumptions, so estimates stay explainable.",
  },
  {
    title: "What's the fastest path to improving it?",
    body: "Practical guidance through Fix Path™ — from insight to execution.",
  },
] as const;

const PHILOSOPHY = [
  "Every recommendation should be understandable.",
  "Every score should be transparent.",
  "Every estimate should explain its assumptions.",
  "Every opportunity should include a clear path forward.",
] as const;

export default function AboutPage() {
  return (
    <>
      {/* Hero — brand first */}
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 lg:pb-24 lg:pt-20">
          <p className="animate-rise font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            MoneyGap<span className="text-accent"> AI</span>
          </p>
          <h1 className="animate-rise-delay-1 mt-5 max-w-3xl text-xl font-medium leading-snug tracking-tight text-fg sm:text-2xl lg:text-3xl">
            Every great business has hidden opportunities.
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Every day, businesses lose customers, revenue, and growth — not from
            a lack of passion, but from details that go unnoticed. We call those
            hidden weaknesses <span className="text-fg">Money Gaps™</span>.
            MoneyGap AI was built to find them — and help you close them.
          </p>
          <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <StartFreeButton label="Analyze your site" size="lg" />
            <Button href="/pricing" variant="secondary" size="lg">
              View pricing
            </Button>
          </div>
        </div>
      </section>

      {/* The gaps that hide */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            The quiet limiters
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">
            One issue alone may seem small. Together, they limit growth.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted">
            These gaps rarely announce themselves. They stack — quietly reducing
            conversion, visibility, and potential until someone looks closely.
          </p>
          <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {GAP_EXAMPLES.map((item) => (
              <li
                key={item}
                className="border-l border-border pl-4 text-sm leading-relaxed text-fg"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The idea */}
      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                The idea
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                More data than ever — and harder decisions.
              </h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-fg-muted">
                <p>
                  Businesses juggle SEO tools, analytics, performance monitors,
                  marketing dashboards, CRMs, AI assistants, and spreadsheets —
                  each showing only part of the picture.
                </p>
                <p>
                  The real problem isn&apos;t a lack of information. It&apos;s
                  the lack of a single intelligent system that connects
                  everything and answers the questions every owner is asking.
                </p>
                <p className="text-fg">
                  MoneyGap AI was created to answer those questions.
                </p>
              </div>
            </div>
            <ol className="space-y-0 divide-y divide-border border-y border-border">
              {OWNER_QUESTIONS.map((q, i) => (
                <li
                  key={q}
                  className="flex gap-4 py-4 text-sm leading-relaxed text-fg"
                >
                  <span className="font-display text-lg font-semibold tabular-nums text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-0.5">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* From analyzer to Growth OS */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Evolution
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight">
            From website analyzer to Growth Operating System™
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-fg-muted">
            <p>
              The original vision was simple: analyze a website and surface
              hidden opportunities. As we built, something became clear —
              businesses didn&apos;t need another audit tool.
            </p>
            <p>
              They needed an intelligent platform that could continuously
              monitor, understand, prioritize, and improve growth.
            </p>
            <p className="text-fg">
              Today, MoneyGap AI is an{" "}
              <strong className="font-semibold">
                AI-powered Growth Operating System™
              </strong>{" "}
              — discover opportunities, prioritize improvements, execute
              changes, and measure results from one place.
            </p>
          </div>
        </div>
      </section>

      {/* What is a Money Gap */}
      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Definition
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight">
            What is a Money Gap™?
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-muted">
            A Money Gap™ is any hidden weakness, missed opportunity, or
            overlooked improvement that keeps a business from its full
            potential. Some are technical. Some are strategic. Some are
            operational. Others are simply opportunities no one noticed.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-fg-muted">
            MoneyGap AI searches across areas such as:
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {OPPORTUNITY_DOMAINS.map((domain) => (
              <li
                key={domain}
                className="text-sm leading-relaxed text-fg before:mr-2 before:text-accent before:content-['·']"
              >
                {domain}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl text-base leading-relaxed text-fg-muted">
            Every opportunity is evaluated, prioritized, and turned into a clear
            action plan — often scored with Opportunity Index™ so you know what
            to ship first.
          </p>
        </div>
      </section>

      {/* Built around action */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Built around action
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">
            Finding problems isn&apos;t enough.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted">
            Businesses don&apos;t need longer reports. They need better
            decisions. Every recommendation inside MoneyGap AI is designed to
            answer four questions:
          </p>
          <ol className="mt-10 divide-y divide-border border-y border-border">
            {ACTION_QUESTIONS.map((item, i) => (
              <li
                key={item.title}
                className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr] sm:gap-8"
              >
                <span className="font-display text-sm font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")} · {item.title}
                </span>
                <p className="text-sm leading-relaxed text-fg-muted sm:pt-0.5">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Continuous intelligence */}
      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Continuous intelligence
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">
            Intelligence that never stops learning.
          </h2>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-fg-muted">
            <p>
              As businesses grow, technology shifts, and best practices evolve,
              MoneyGap AI keeps learning — improving how it finds and ranks
              opportunities.
            </p>
            <p>
              Rather than one-time reports, the platform continuously monitors
              growth opportunities and delivers ongoing recommendations so you
              stay ahead.
            </p>
            <p className="text-fg">
              Growth isn&apos;t a one-time project. It&apos;s a continuous
              process.
            </p>
          </div>
        </div>
      </section>

      {/* Designed for every business */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Who it&apos;s for
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight">
            Designed for every business under pressure to grow.
          </h2>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-fg-muted">
            <p>
              Whether you&apos;re a startup, local business, ecommerce brand,
              nonprofit, agency, SaaS company, or enterprise, the constraints
              rhyme: limited time, limited resources, too many priorities.
            </p>
            <p>
              MoneyGap AI cuts through the noise by surfacing the improvements
              most likely to create meaningful impact — without forcing you to
              become an expert in SEO, marketing, analytics, performance, and AI
              separately.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Philosophy
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">
            Technology should simplify business — not complicate it.
          </h2>
          <ul className="mt-8 max-w-2xl space-y-3">
            {PHILOSOPHY.map((line) => (
              <li
                key={line}
                className="border-l-2 border-accent/40 pl-4 text-base leading-relaxed text-fg"
              >
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-fg-muted">
            We believe AI should empower people to make better decisions — not
            replace human judgment. Our goal is clarity, confidence, and
            direction so teams spend less time guessing and more time growing.
          </p>
        </div>
      </section>

      {/* Mission + Vision */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Mission
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Discover. Decide. Grow.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-muted">
              Help businesses discover hidden opportunities, make smarter
              decisions, and unlock sustainable growth through intelligent,
              evidence-based insights.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Vision
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              The trusted Growth Operating System™
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-muted">
              Become the world&apos;s most trusted AI-powered Growth Operating
              System™ — helping organizations continuously discover, prioritize,
              implement, and measure the improvements that matter most.
            </p>
          </div>
        </div>
      </section>

      {/* Why we built it */}
      <section className="relative overflow-hidden border-t border-border bg-hero py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Why we built MoneyGap AI
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Because every business deserves to know where opportunities hide.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-fg-muted">
            <p>
              Because growth shouldn&apos;t depend on guesswork. Because
              technology should provide answers — not more complexity. And
              because the difference between a good business and a great one is
              often found in the opportunities no one else sees.
            </p>
            <p className="text-fg">
              MoneyGap AI exists to uncover those opportunities — and help turn
              them into measurable results.
            </p>
            <p className="font-medium text-fg">
              Welcome to the future of intelligent business growth.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <StartFreeButton label="Start free analysis" size="lg" />
            <Button href="/academy" variant="secondary" size="lg">
              Explore Growth Academy™
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
