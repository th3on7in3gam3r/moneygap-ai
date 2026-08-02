import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Features",
  description:
    "MoneyGap AI Growth Operating System™ — analyze sites, find Money Gaps™, prioritize with Opportunity Index™, and close leaks with Fix Paths™.",
  path: "/features",
});

const FEATURES = [
  {
    title: "Money Gap Engine™",
    body: "Surface hidden revenue leaks across SEO, conversion, trust, performance, content, and AI visibility.",
  },
  {
    title: "Opportunity Index™",
    body: "Rank what to fix first with transparent impact framing — not vanity scores.",
  },
  {
    title: "Fix Path™ & Action Center",
    body: "Move from insight to execution with practical playbooks and implementation guidance.",
  },
  {
    title: "Growth Academy™",
    body: "Educational playbooks matched to the gaps you find — learn, then ship.",
  },
  {
    title: "AI Growth Concierge™",
    body: "Ask what to prioritize next and navigate straight into Money Gaps, reports, and tools.",
  },
  {
    title: "Monitor & measure",
    body: "Continuous monitoring so growth stays a process — not a one-time audit.",
  },
] as const;

export default function FeaturesPage() {
  return (
    <MarketingPageShell
      eyebrow="Product"
      title="Everything you need to close Money Gaps™"
      description="One Growth Operating System™ to discover opportunities, prioritize work, execute Fix Paths™, and measure results."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Features", path: "/features" },
      ]}
      primaryCta={{ label: "Analyze your site", signUp: true }}
    >
      <ul className="divide-y divide-border border-y border-border">
        {FEATURES.map((f) => (
          <li key={f.title} className="grid gap-2 py-6 sm:grid-cols-[16rem_1fr] sm:gap-8">
            <h2 className="font-display text-lg font-semibold text-fg">{f.title}</h2>
            <p className="text-sm leading-relaxed text-fg-muted sm:pt-1">{f.body}</p>
          </li>
        ))}
      </ul>
    </MarketingPageShell>
  );
}
