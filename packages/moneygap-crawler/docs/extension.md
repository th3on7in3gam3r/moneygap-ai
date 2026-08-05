# Extension guide

## Add a page-type pattern

Edit `src/discovery/prioritize.ts` and add a `PAGE_TYPE_PATTERNS` entry.

## Add a framework detector

Edit `src/framework-detectors/index.ts`. Set `needsJs` only when static HTML is insufficient.

## Custom progress sink

```ts
await crawlSite(
  { url: "https://example.com", mode: "standard" },
  {
    onProgress: async (e) => {
      console.log(e.phase, e.pagesProcessed, e.currentUrl);
    },
  },
);
```

## Deep jobs from the app

```ts
import { enqueueDeepCrawlJob } from "@/lib/analysis/crawl-jobs";

await enqueueDeepCrawlJob({ url, analysisId, maxPages: 200 });
```

Worker persists pages into `crawl_pages`. Wire analysis consumption in a later phase if you want Deep results to replace in-process crawl for large sites.
