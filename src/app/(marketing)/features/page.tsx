import Link from "next/link";
import { StartFreeButton } from "@/components/auth-buttons";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqBlock } from "@/components/marketing/faq-block";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Features — Growth Operating System™",
  description:
    "MoneyGap Engine™, Crawlability Score™, Fix Path™, Copilot, SEO Intelligence™, Trust Engine™, Growth Academy™, and more — the full MoneyGap AI capability map.",
  path: "/features",
});

type FeatureBlock = {
  id: string;
  title: string;
  does: string;
  why: string;
  impact: string;
  useCase: string;
};

const FEATURES: FeatureBlock[] = [
  {
    id: "engine",
    title: "MoneyGap Engine™",
    does: "Runs modular intelligence across revenue, SEO, content, trust, conversion, marketing, automation, customer, AI, and competitive gaps.",
    why: "Growth work fails when findings are siloed. One engine keeps every miss tied to business outcomes.",
    impact: "Teams see a ranked backlog of Money Gaps™ instead of disconnected tool alerts.",
    useCase: "A SaaS founder runs an analysis and gets a MoneyGap Score™ plus module breakdown in one report.",
  },
  {
    id: "copilot",
    title: "AI Growth Copilot™",
    does: "Answers “what should we fix next?” with navigation into reports, gaps, and Fix Paths™.",
    why: "Operators need guidance in context — not another chat that ignores your live gaps.",
    impact: "Faster prioritization with transparent AI Estimates and clear next actions.",
    useCase: "A growth lead asks Copilot for the top Fix Path™ after a re-scan and jumps straight into Action Center.",
  },
  {
    id: "detection",
    title: "Money Gap Detection",
    does: "Detects concrete misses: CTAs, trust, crawl/index issues, content coverage, AI visibility, and more.",
    why: "Vague “improve SEO” advice does not move revenue. Named gaps do.",
    impact: "Each gap includes evidence, confidence, and estimated opportunity framing.",
    useCase: "An agency spots missing trust signals on a client pricing page before a campaign launch.",
  },
  {
    id: "fix-path",
    title: "Fix Path™",
    does: "Turns opportunities into implementation paths — Action Center, checklists, Developer Mode, automation, or advisor.",
    why: "Insight without execution is shelfware. Fix Path™ closes the loop.",
    impact: "Clear ownership, estimated time, and verification steps for each priority.",
    useCase: "A developer pulls an IDE prompt for a metadata Fix Path™ and ships in the same sprint.",
  },
  {
    id: "seo",
    title: "SEO Intelligence™",
    does: "Combines Engine SEO findings with deterministic HTML/site-file scanners for titles, schema, links, and coverage.",
    why: "SEO only matters when it connects to traffic → leads → revenue.",
    impact: "Evidence-backed SEO gaps with Fix Paths™ — not invented rankings.",
    useCase: "Self Optimization™ flags weak titles and missing JSON-LD on MoneyGap’s own marketing pages.",
  },
  {
    id: "crawlability",
    title: "Crawlability Score™",
    does: "Scores how easily search engines and AI systems can discover and crawl the site (robots, sitemap, redirects, canonicals, indexability).",
    why: "If crawlers cannot reach you, every other growth score is downstream noise.",
    impact: "Status bands Excellent → Critical with contributor breakdown and Fix Paths™.",
    useCase: "A site with a redirect chain and blocked homepage sees Critical crawlability and a direct Fix Path™.",
  },
  {
    id: "backlinks",
    title: "Backlink Intelligence™",
    does: "Frames authority and backlink health as growth opportunities (setup expands as connectors mature).",
    why: "Authority gaps compound SEO and AI citation outcomes over time.",
    impact: "Prioritized authority work instead of vanity link counts.",
    useCase: "A content team aligns digital PR targets to Money Gaps™ on commercial pages.",
  },
  {
    id: "content-gap",
    title: "Content Gap Engine™",
    does: "Checks expected high-intent paths and topical coverage against what buyers need to convert.",
    why: "Missing pages are silent revenue leaks.",
    impact: "A backlog of content opportunities mapped to funnel stages.",
    useCase: "MoneyGap detects no /compare or /security page and ranks the business impact.",
  },
  {
    id: "trust-engine",
    title: "Trust Engine™",
    does: "Adds confidence, evidence summaries, and decision framing so teams know what to trust in the report.",
    why: "AI recommendations without trust controls create risk.",
    impact: "Clearer top priorities, quick wins, and confidence levels on opportunity cards.",
    useCase: "An exec brief highlights Top 3 Priorities with supporting signals before budget approval.",
  },
  {
    id: "conversion",
    title: "Conversion Intelligence™",
    does: "Finds CTA, form, booking, and journey friction that blocks capture.",
    why: "Traffic without conversion is expensive theater.",
    impact: "Fixes that raise signup or checkout completion — estimated, then verified.",
    useCase: "A pricing page missing a primary CTA gets a high Opportunity Index™ Fix Path™.",
  },
  {
    id: "ai-visibility",
    title: "AI Visibility Engine™",
    does: "Evaluates machine-readable identity — JSON-LD, landmarks, llms.txt, and crawl guidance for AI systems.",
    why: "Buyers and assistants increasingly discover products outside classic SERPs.",
    impact: "Stronger extractability and product identity for AI-assisted discovery.",
    useCase: "Publishing Organization + SoftwareApplication schema lifts AI Visibility on the homepage.",
  },
  {
    id: "academy",
    title: "Growth Academy™",
    does: "Publishes educational playbooks and maps them to open gaps in the product.",
    why: "Teams learn faster when education is tied to their live backlog.",
    impact: "Shorter time from “what is this?” to “we shipped the fix.”",
    useCase: "A learner home recommends technical SEO articles after Crawlability issues appear.",
  },
  {
    id: "team",
    title: "Team Workspace™",
    does: "Shared workspaces, seats, and collaboration around reports and Action Center.",
    why: "Growth is a team sport — scores must live where the team works.",
    impact: "Aligned priorities across founder, marketing, and engineering.",
    useCase: "A Growth plan workspace assigns Fix Path™ owners with deadlines.",
  },
  {
    id: "agency",
    title: "Agency Features™",
    does: "Client workspaces, white-label report options, and multi-client agency tooling on higher plans.",
    why: "Agencies need client isolation and brandable delivery.",
    impact: "Run MoneyGap as an operating layer across a portfolio.",
    useCase: "An agency switches clients, exports a branded Growth Report, and tracks capture per account.",
  },
  {
    id: "integrations",
    title: "Integrations",
    does: "Integration Hub connects analysis and Fix Paths™ to the rest of the stack (GitHub, Stripe, HubSpot, and expanding catalog).",
    why: "Growth systems should meet tools teams already use.",
    impact: "Less copy-paste between MoneyGap and delivery systems.",
    useCase: "Billing Checkout via Stripe; product issues linked toward engineering workflows.",
  },
];

const FEATURE_FAQ = [
  {
    question: "Do I need every engine on day one?",
    answer:
      "No. Start with an analysis and Fix Path™ on your highest Opportunity Index™ gaps. Scores like Crawlability deepen as you re-scan.",
  },
  {
    question: "Is Crawlability the same as MoneyGap Score™?",
    answer:
      "No. Crawlability Score™ is a health metric (higher is better). MoneyGap Score™ measures uncaptured opportunity (higher means more work left).",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Features", path: "/features" },
            ]),
          ),
        }}
      />
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-8 lg:pb-20 lg:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Features
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Everything in the Growth Operating System™
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            From Money Gap Detection to Crawlability Score™ and Fix Path™ —
            each capability exists to find leaks, prioritize honestly, and help
            you ship.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StartFreeButton label="Analyze your site" size="lg" />
            <Button href="/pricing" variant="secondary" size="lg">
              View pricing
            </Button>
          </div>
        </div>
      </section>

      {FEATURES.map((f, i) => (
        <section
          key={f.id}
          id={f.id}
          className={`border-t border-border py-16 sm:py-20 ${
            i % 2 === 1 ? "bg-bg-elevated" : ""
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading eyebrow={`Capability ${i + 1}`} title={f.title} />
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div className="space-y-4 text-sm leading-relaxed text-fg-muted">
                <p>
                  <span className="font-medium text-fg">What it does. </span>
                  {f.does}
                </p>
                <p>
                  <span className="font-medium text-fg">Why it matters. </span>
                  {f.why}
                </p>
              </div>
              <div className="space-y-4 text-sm leading-relaxed text-fg-muted">
                <p>
                  <span className="font-medium text-fg">Business impact. </span>
                  {f.impact}
                </p>
                <p>
                  <span className="font-medium text-fg">Example. </span>
                  {f.useCase}
                </p>
                <StartFreeButton label="Try this in MoneyGap" size="md" />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FaqBlock items={FEATURE_FAQ} />
          <p className="mt-8 text-sm text-fg-muted">
            Prefer a guided tour?{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Contact sales
            </Link>{" "}
            or read{" "}
            <Link href="/docs" className="text-accent hover:underline">
              Docs
            </Link>
            .
          </p>
        </div>
      </section>

      <CtaBand
        title="Ready to close your Money Gaps™?"
        description="Start free, run an analysis, and open your first Fix Path™ today."
      />
    </>
  );
}
