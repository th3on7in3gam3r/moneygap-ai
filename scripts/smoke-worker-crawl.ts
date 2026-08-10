/**
 * Smoke helper: validates worker product-drain extract against a live URL.
 * Run: npx tsx scripts/smoke-worker-crawl.ts
 * Optional: SMOKE_URL=https://www.signaldeskblog.com
 */
import {
  extractSinglePage,
  classifyPageType,
  toScrapedPage,
} from "moneygap-crawler";

async function main() {
  const url = process.env.SMOKE_URL || "https://www.signaldeskblog.com";
  console.log("smoke-worker-crawl: extracting", url);

  const record = await extractSinglePage(url, {
    playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
    timeoutMs: 20_000,
  });
  if (!record || record.markdown.trim().length < 40) {
    console.error("FAIL: thin/empty extract");
    process.exit(1);
  }

  const scraped = toScrapedPage({
    ...record,
    pageType: classifyPageType(record.finalUrl || record.url, url),
  });

  console.log("OK", {
    url: scraped.url,
    pageType: scraped.pageType,
    title: scraped.title,
    markdownChars: scraped.markdown.length,
  });

  const unique = [url.replace(/\/$/, "")];
  const results = await Promise.all(
    unique.map((u) =>
      extractSinglePage(u, { timeoutMs: 15_000 }).then((r) =>
        r && r.markdown.trim().length >= 40 ? 1 : 0,
      ),
    ),
  );
  const okCount = results.reduce((a: number, b: number) => a + b, 0);
  console.log("OK concurrent extracts", { attempted: unique.length, okCount });
  if (okCount < 1) {
    console.error("FAIL: concurrent extract produced no pages");
    process.exit(1);
  }
  console.log("smoke-worker-crawl: passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
