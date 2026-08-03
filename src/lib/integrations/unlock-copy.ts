/** One-line “what this unlocks today” per provider slug. */
export function providerUnlockLine(slug: string): string {
  switch (slug) {
    case "github":
      return "Unlocks Developer Mode™ — repos, Project Memory™, IDE prompts, and draft PRs only.";
    case "stripe":
      return "Stages your Stripe account for Hub health (not MoneyGap billing). Live Engine enrichment coming.";
    case "hubspot":
      return "Stages CRM credentials for Hub health and Connection Map. Live Engine enrichment coming.";
    case "google_analytics":
    case "microsoft_clarity":
      return "Stages analytics credentials for Hub health. Crawl/traffic findings from Hub are not wired yet.";
    case "google_search_console":
      return "Stages Search Console credentials for Hub health. Live indexing pull from Hub is not wired yet.";
    case "cloudflare_pages":
      return "Stages hosting credentials for Hub health. Crawlability notes connection presence only for now.";
    default:
      return "Stages credentials for Integration Health and Connection Map. Live Engine enrichment ships incrementally.";
  }
}

export function connectedSuccessMessage(slug: string, name?: string): string {
  const label = name ?? slug;
  if (slug === "github") {
    return `Connected ${label}. Developer Mode™ is ready — open Developer Mode for repos, Project Memory™, and draft PRs.`;
  }
  return `Connected ${label}. Integration Health and Connection Map will reflect this connection. Engine enrichment from Hub data ships incrementally.`;
}
