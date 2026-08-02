import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Marketplace",
  description:
    "MoneyGap Marketplace — partners, playbooks, and growth resources that extend your Growth Operating System™.",
  path: "/marketplace",
});

export default function MarketplaceMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Marketplace"
      title="Extend MoneyGap with partners and playbooks"
      description="Discover complementary tools and resources in the MoneyGap Marketplace. Full catalog access is available after you sign in."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Marketplace", path: "/marketplace" },
      ]}
      primaryCta={{ label: "Open Marketplace", href: "/dashboard/marketplace" }}
    >
      <p className="max-w-2xl text-base leading-relaxed text-fg-muted">
        Browse Growth Stack sister products, partner listings, and learning
        resources aligned to closing Money Gaps™ — then jump into the signed-in
        Marketplace when you&apos;re ready.
      </p>
    </MarketingPageShell>
  );
}
