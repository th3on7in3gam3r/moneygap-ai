import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  planStaleReclaim,
  shouldRetryAfterFail,
  MAX_PAGE_ATTEMPTS,
} from "./reclaim";
import { withTimeout } from "./watchdog";

describe("planStaleReclaim", () => {
  it("requeues stale processing under max attempts", () => {
    const now = Date.now();
    const plan = planStaleReclaim(
      [
        {
          id: "a",
          state: "processing",
          attempts: 1,
          updatedAt: new Date(now - 30_000),
        },
        {
          id: "b",
          state: "processing",
          attempts: 1,
          updatedAt: new Date(now - 1_000),
        },
        {
          id: "c",
          state: "queued",
          attempts: 0,
          updatedAt: new Date(now - 60_000),
        },
      ],
      { now, staleMs: 20_000 },
    );
    assert.deepEqual(plan, [{ id: "a", nextState: "retry" }]);
  });

  it("fails stale processing at max attempts", () => {
    const now = Date.now();
    const plan = planStaleReclaim(
      [
        {
          id: "x",
          state: "processing",
          attempts: MAX_PAGE_ATTEMPTS,
          updatedAt: new Date(now - 60_000),
        },
      ],
      { now, staleMs: 20_000 },
    );
    assert.deepEqual(plan, [{ id: "x", nextState: "failed" }]);
  });
});

describe("shouldRetryAfterFail", () => {
  it("caps retries by attempts", () => {
    assert.equal(shouldRetryAfterFail(1, true), true);
    assert.equal(shouldRetryAfterFail(MAX_PAGE_ATTEMPTS, true), false);
    assert.equal(shouldRetryAfterFail(1, false), false);
  });
});

describe("withTimeout", () => {
  it("rejects hanging promises", async () => {
    await assert.rejects(
      () =>
        withTimeout(
          new Promise(() => {
            /* never */
          }),
          50,
          "hang",
        ),
      /timed out/i,
    );
  });

  it("resolves fast promises", async () => {
    const v = await withTimeout(Promise.resolve(42), 200, "ok");
    assert.equal(v, 42);
  });
});
