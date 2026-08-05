import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeCrawlUrl } = require(
  "../../../packages/moneygap-crawler/dist/index.js",
) as { normalizeCrawlUrl: (raw: string) => string };

describe("normalizeCrawlUrl", () => {
  it("collapses trailing slash, hash, and tracking params", () => {
    const a = normalizeCrawlUrl("https://example.com");
    const b = normalizeCrawlUrl("https://example.com/");
    const c = normalizeCrawlUrl("https://example.com/#section");
    const d = normalizeCrawlUrl("https://example.com/?utm_source=x&fbclid=1");
    const e = normalizeCrawlUrl("http://example.com");
    assert.equal(a, b);
    assert.equal(a, c);
    assert.equal(a, d);
    assert.equal(a, e);
  });

  it("keeps meaningful query params", () => {
    const u = normalizeCrawlUrl("https://example.com/search?q=shoes");
    assert.match(u, /q=shoes/);
    assert.equal(u.includes("utm_"), false);
  });
});
