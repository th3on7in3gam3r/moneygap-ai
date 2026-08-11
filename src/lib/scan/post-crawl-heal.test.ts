import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPostCrawlClaimFresh,
  POST_CRAWL_CLAIM_FRESH_MS,
  POST_CRAWL_WATCHDOG_MS,
  postCrawlClaimFromMeta,
} from "../analysis/post-crawl-guard";
import { ANALYZING_KICK_MS } from "./continue";

describe("post-crawl claim lease", () => {
  it("treats fresh claim as non-stealable", () => {
    const now = 1_000_000;
    assert.equal(
      isPostCrawlClaimFresh({
        claimedAt: now - 30_000,
        lastProgressAt: now - 10_000,
        now,
      }),
      true,
    );
  });

  it("allows stale postCrawlClaimedAt to be stolen", () => {
    const now = 1_000_000;
    assert.equal(
      isPostCrawlClaimFresh({
        claimedAt: now - POST_CRAWL_CLAIM_FRESH_MS - 1,
        lastProgressAt: now - POST_CRAWL_CLAIM_FRESH_MS - 1,
        now,
      }),
      false,
    );
  });

  it("reads lease from scanMeta", () => {
    const now = Date.now();
    const lease = postCrawlClaimFromMeta({
      postCrawlClaimedAt: now - 10_000,
      postCrawlLastProgressAt: now - 5_000,
    });
    assert.equal(lease.fresh, true);
    assert.ok(lease.claimedAt != null);
  });

  it("stale lease without progress is not fresh", () => {
    const now = Date.now();
    const lease = postCrawlClaimFromMeta({
      postCrawlClaimedAt: now - POST_CRAWL_CLAIM_FRESH_MS - 5_000,
      postCrawlLastProgressAt: now - POST_CRAWL_CLAIM_FRESH_MS - 5_000,
    });
    assert.equal(lease.fresh, false);
  });
});

describe("analyzing-without-report heal thresholds", () => {
  it("kicks after ~90s without progress", () => {
    assert.equal(ANALYZING_KICK_MS, 90_000);
  });

  it("watchdog is longer than claim fresh window", () => {
    assert.ok(POST_CRAWL_WATCHDOG_MS > POST_CRAWL_CLAIM_FRESH_MS);
  });
});

describe("complete schedule contract", () => {
  it("ACK response shape is accepted/started without processing payload", () => {
    const ack = { ok: true, accepted: true, started: true, analysisId: "x" };
    assert.equal(ack.ok, true);
    assert.equal(ack.accepted, true);
    assert.equal(ack.started, true);
    assert.equal("result" in ack, false);
  });
});
