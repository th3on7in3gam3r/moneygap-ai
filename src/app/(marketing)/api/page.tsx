import { buildPageMetadata } from "@/lib/seo";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata = buildPageMetadata({
  title: "API",
  description:
    "MoneyGap AI API — programmatic access to analyses, scores, opportunities, and webhooks. Included on all plans with monthly quotas.",
  path: "/api",
});

export default function ApiMarketingPage() {
  return (
    <MarketingPageShell
      eyebrow="Developers"
      title="Build on MoneyGap AI"
      description="Use the MoneyGap API™ to automate analyses and pull growth intelligence into your own workflows. API access is included on all plans."
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
        <p>
          Full reference:{" "}
          <a href="/docs/moneygap-api" className="text-accent hover:underline">
            MoneyGap API™ docs
          </a>
          . Machine-readable OpenAPI:{" "}
          <a
            href="/openapi/moneygap-v1.json"
            className="text-accent hover:underline"
          >
            /openapi/moneygap-v1.json
          </a>
          .
        </p>
        <p className="text-sm">
          Free live diagnostics without a key:{" "}
          <code className="text-xs text-fg">
            npx moneygap-scan https://example.com
          </code>
          {" · "}
          <a href="/cli" className="text-accent hover:underline">
            CLI
          </a>
          .
        </p>
      </div>
    </MarketingPageShell>
  );
}
