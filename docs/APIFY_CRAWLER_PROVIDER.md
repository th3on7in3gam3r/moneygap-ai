# Apify Crawler Provider

> Superseded in part by the [Crawl Orchestrator™](./CRAWLER_ARCHITECTURE.md).
> Apify remains the **primary** async whole-site crawler inside that orchestrator.

See also:

- [Root cause audit](./CRAWLER_ROOT_CAUSE_AUDIT.md)
- [Troubleshooting](./CRAWLER_TROUBLESHOOTING.md)

## Quick reference

- Actor: `apify/website-content-crawler` (`apify~website-content-crawler`)
- Auth: `Authorization: Bearer ${APIFY_API_TOKEN}` (never in URL). Alias: `APIFY_TOKEN` is also accepted.
- Start async → persist `providerRunId` → poll via `/api/scan/tick`
- On success/failure with dataset: merge into SuccessfulPageMap → Firecrawl/Scrape.do recovery
- Never hold the initial Vercel request open for the crawl

Disable: omit `APIFY_API_TOKEN` or set `CRAWL_PROVIDER=native`.
