import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "API",
  description:
    "MoneyGap AI API — programmatic access to analyses and growth intelligence for Professional plans and above.",
  path: "/api",
});

export default function ApiMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Developers"
      title="Build on MoneyGap AI"
      description="Use the MoneyGap API to automate analyses and pull growth intelligence into your own workflows. API access is available on eligible plans."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "API", path: "/api" },
      ]}
      primaryCta={{ label: "Developer console", href: "/dashboard/developers" }}
    >
      <div className="max-w-2xl space-y-4 text-base leading-relaxed text-fg-muted">
        <p>
          Create API keys in the signed-in developer console, review scopes, and
          call authenticated endpoints under{" "}
          <code className="text-xs text-fg">/api/v1</code>.
        </p>
        <p className="text-sm">
          Looking for human-readable guides? Start with{" "}
          <a href="/docs" className="text-accent hover:underline">
            Documentation
          </a>
          .
        </p>
      </div>
    </MarketingPageShell>
  );
}
