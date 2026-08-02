import { absoluteUrl, getSiteOrigin } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = getSiteOrigin();
  const lines = [
    "# MoneyGap AI",
    "",
    "> AI-powered Growth Operating System™ that finds Money Gaps™ — hidden revenue leaks and growth opportunities — then helps teams prioritize, fix, and measure them.",
    "",
    `Site: ${origin}`,
    "",
    "## Primary pages",
    "",
    `- Home: ${absoluteUrl("/")}`,
    `- Features: ${absoluteUrl("/features")}`,
    `- Pricing: ${absoluteUrl("/pricing")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- Contact: ${absoluteUrl("/contact")}`,
    `- Growth Academy™: ${absoluteUrl("/academy")}`,
    `- Academy RSS: ${absoluteUrl("/academy/rss.xml")}`,
    `- Docs: ${absoluteUrl("/docs")}`,
    `- Marketplace: ${absoluteUrl("/marketplace")}`,
    `- Integrations: ${absoluteUrl("/integrations")}`,
    `- API overview: ${absoluteUrl("/api")}`,
    "",
    "## Product",
    "",
    "- Analyze websites for Money Gaps™ across SEO, conversion, trust, performance, content, and AI visibility",
    "- Prioritize with Opportunity Index™ and execute via Fix Path™ / Action Center",
    "- Growth Academy™ publishes educational playbooks aligned to closing gaps",
    "",
    "## Legal",
    "",
    `- Privacy: ${absoluteUrl("/privacy")}`,
    `- Terms: ${absoluteUrl("/terms")}`,
    "",
    "## Optional",
    "",
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
