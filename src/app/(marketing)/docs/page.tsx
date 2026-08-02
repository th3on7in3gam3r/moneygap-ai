import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Documentation",
  description:
    "Learn how to use MoneyGap AI — analyses, Money Gaps™, Fix Paths™, Growth Academy™, and more.",
  path: "/docs",
});

export default function DocsMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Documentation"
      title="Guides for closing gaps faster"
      description="Public overview of MoneyGap AI docs. Signed-in teams get deeper product documentation inside the dashboard."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
      ]}
      primaryCta={{ label: "Open dashboard docs", href: "/dashboard/docs" }}
    >
      <ul className="divide-y divide-border border-y border-border text-sm">
        {[
          ["Analyze a website", "Run your first scan and read the Money Gap report."],
          ["Prioritize opportunities", "Use Opportunity Index™ to decide what ships next."],
          ["Fix Paths™", "Turn recommendations into implementation-ready steps."],
          ["Growth Academy™", "Match playbooks to open gaps at /academy."],
        ].map(([t, b]) => (
          <li key={t} className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr]">
            <span className="font-medium text-fg">{t}</span>
            <span className="text-fg-muted">{b}</span>
          </li>
        ))}
      </ul>
    </MarketingPageShell>
  );
}
