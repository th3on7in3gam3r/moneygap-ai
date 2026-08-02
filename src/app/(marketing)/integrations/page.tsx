import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "Integrations",
  description:
    "Connect MoneyGap AI to your stack — analytics, publishing, and Growth Stack tools that keep insights close to execution.",
  path: "/integrations",
});

export default function IntegrationsMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Integrations"
      title="Connect the tools you already use"
      description="MoneyGap Integration Hub connects analysis and Fix Paths™ to the rest of your growth stack."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Integrations", path: "/integrations" },
      ]}
      primaryCta={{ label: "Open Integrations", href: "/dashboard/integrations" }}
    >
      <p className="max-w-2xl text-base leading-relaxed text-fg-muted">
        Wire up providers from the dashboard Integration Hub after you sign in.
        Public overview pages stay indexable; credentials and connections remain
        private to your workspace.
      </p>
    </MarketingPageShell>
  );
}
