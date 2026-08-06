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
      return "Google OAuth is not configured yet — Connect stages a Pending row until GA4 OAuth is enabled. Checklist stays open until status is Connected.";
    case "microsoft_clarity":
      return "Stages analytics credentials for Hub health. Crawl/traffic findings from Hub are not wired yet.";
    case "cadence_pulse":
      return "Connects Cadence Pulse — paste the Collect key (pck_…) so the public site pixel can authenticate with Pulse.";
    case "google_search_console":
      return "Google OAuth is not configured yet — Connect stages a Pending row until Search Console OAuth is enabled. Checklist stays open until status is Connected.";
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
  if (slug === "cadence_pulse") {
    return `Connected ${label}. The site pixel will use this Collect key on the next page load.`;
  }
  return `Connected ${label}. Integration Health and Connection Map will reflect this connection. Engine enrichment from Hub data ships incrementally.`;
}
