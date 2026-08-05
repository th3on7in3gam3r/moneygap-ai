/**
 * Post-crawl analysis entry: corpus already in website_pages / crawl_pages.
 * Tick path calls this after the page queue drains.
 */
export { runPostCrawlAnalysis as runAnalysisFromStoredPages } from "@/lib/analysis/pipeline";
