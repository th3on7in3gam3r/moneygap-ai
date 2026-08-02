/**
 * Optional Hub integrations for Crawlability Score™.
 * When connectors are stubs / disconnected, record unavailable reasons —
 * never invent GSC/GA/Cloudflare findings.
 */

export type CrawlabilityIntegrationNotes = Record<string, string>;

export async function crawlabilityIntegrationNotes(
  workspaceId?: string,
): Promise<CrawlabilityIntegrationNotes> {
  const notes: CrawlabilityIntegrationNotes = {
    google_search_console:
      "Google Search Console is not connected — coverage, indexing, and sitemap submission status were not evaluated.",
    google_analytics:
      "Google Analytics is not connected — organic landing / crawl-correlated traffic was not evaluated.",
    cloudflare:
      "Cloudflare crawl/bot analytics are not connected — edge bot insights were not evaluated.",
  };

  if (!workspaceId) return notes;

  try {
    const { db } = await import("@/db");
    const { integrationConnections } = await import("@/db/schema");
    const { and, eq, inArray } = await import("drizzle-orm");

    const rows = await db
      .select({
        providerSlug: integrationConnections.providerSlug,
        status: integrationConnections.status,
      })
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.workspaceId, workspaceId),
          inArray(integrationConnections.providerSlug, [
            "google_search_console",
            "google_analytics",
            "cloudflare",
            "cloudflare_pages",
          ]),
        ),
      )
      .limit(10);

    const connected = new Set(
      rows
        .filter((r) => r.status === "connected")
        .map((r) => r.providerSlug),
    );

    if (connected.has("google_search_console")) {
      notes.google_search_console =
        "Search Console is connected, but crawl/index coverage APIs are not yet wired into Crawlability Score™ — coverage was not evaluated.";
    }
    if (connected.has("google_analytics")) {
      notes.google_analytics =
        "Google Analytics is connected, but crawlability does not yet pull GA4 landing data — traffic correlation was not evaluated.";
    }
    if (connected.has("cloudflare") || connected.has("cloudflare_pages")) {
      notes.cloudflare =
        "Cloudflare is connected, but bot/crawl analytics are not yet wired into Crawlability Score™ — edge crawl insights were not evaluated.";
    }
  } catch {
    /* keep default unavailable notes */
  }

  return notes;
}
