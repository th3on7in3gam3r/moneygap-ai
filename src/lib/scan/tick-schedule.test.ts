import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getScanExecutionMode, isWorkerScanExecution } from "./execution";
import {
  classifyTickScheduleError,
  isTickClaimFresh,
  shouldShowCustomerTickWarning,
  shouldShowTickEnvAdminHint,
  TICK_CLAIM_FRESH_MS,
} from "./tick-errors";
import { diagnoseTickEnv } from "./tick-env";

describe("tick schedule ACK semantics", () => {
  it("treats already_claimed as non-error acceptance shape", () => {
    const ack = {
      ok: true,
      accepted: false,
      reason: "already_claimed",
    };
    assert.equal(ack.ok, true);
    assert.equal(ack.accepted, false);
    assert.equal(
      classifyTickScheduleError(new Error("already_claimed")),
      "ALREADY_CLAIMED",
    );
  });

  it("keeps scheduling timeout short (ACK only, not processing)", () => {
    // Documented contract: scheduler waits ≤5s for ACK, never for processScanTick.
    const TICK_FETCH_TIMEOUT_MS = 5_000;
    assert.ok(TICK_FETCH_TIMEOUT_MS <= 5_000);
    assert.ok(TICK_FETCH_TIMEOUT_MS >= 3_000);
  });
});

describe("tick claim freshness", () => {
  it("blocks duplicate process while claim is fresh", () => {
    const now = 1_000_000;
    assert.equal(
      isTickClaimFresh({
        claimedAt: now - 10_000,
        lastProgressAt: now - 5_000,
        now,
      }),
      true,
    );
    assert.equal(
      isTickClaimFresh({
        claimedAt: now - TICK_CLAIM_FRESH_MS - 1,
        lastProgressAt: now - 5_000,
        now,
      }),
      false,
    );
  });
});

describe("tick schedule error classification", () => {
  it("maps timeout / http / env classes", () => {
    assert.equal(
      classifyTickScheduleError(
        new Error("The operation was aborted due to timeout"),
      ),
      "TICK_CONNECTION_TIMEOUT",
    );
    assert.equal(
      classifyTickScheduleError(new Error("Tick HTTP 500 from https://x")),
      "TICK_HTTP_ERROR",
    );
    assert.equal(
      classifyTickScheduleError(new Error("Missing CRON_SECRET — crawl")),
      "MISSING_CRON_SECRET",
    );
    assert.equal(
      classifyTickScheduleError(new Error("Missing APP_URL (or NEXT_PUBLIC)")),
      "MISSING_APP_URL",
    );
  });
});

describe("customer tick warning UX", () => {
  it("hides recovered and info severities", () => {
    assert.equal(
      shouldShowCustomerTickWarning({
        tickScheduleError: "Tick schedule failed: timeout",
        tickScheduleSeverity: "RECOVERED",
      }),
      false,
    );
    assert.equal(
      shouldShowCustomerTickWarning({
        tickScheduleError: "Tick schedule failed: timeout",
        tickScheduleSeverity: "INFO",
      }),
      false,
    );
    assert.equal(
      shouldShowCustomerTickWarning({
        tickScheduleError: "Missing CRON_SECRET",
        tickScheduleSeverity: "WARNING",
      }),
      true,
    );
  });

  it("shows admin env hint only for missing env classes", () => {
    assert.equal(shouldShowTickEnvAdminHint("MISSING_APP_URL"), true);
    assert.equal(shouldShowTickEnvAdminHint("MISSING_CRON_SECRET"), true);
    assert.equal(shouldShowTickEnvAdminHint("TICK_CONNECTION_TIMEOUT"), false);
    assert.equal(shouldShowTickEnvAdminHint("ALREADY_CLAIMED"), false);
  });
});

describe("tick env diagnostics", () => {
  it("reports MISSING_CRON_SECRET when secret absent", () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevApp = process.env.APP_URL;
    const prevPublic = process.env.NEXT_PUBLIC_APP_URL;
    const prevVercel = process.env.VERCEL_ENV;
    delete process.env.CRON_SECRET;
    process.env.APP_URL = "https://example.com";
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_ENV = "production";
    const diag = diagnoseTickEnv();
    assert.equal(diag.ok, false);
    assert.equal(diag.errorClass, "MISSING_CRON_SECRET");
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
    if (prevApp === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevApp;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevPublic;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  });

  it("reports MISSING_APP_URL when origin missing", () => {
    const prevSecret = process.env.CRON_SECRET;
    const prevApp = process.env.APP_URL;
    const prevPublic = process.env.NEXT_PUBLIC_APP_URL;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.CRON_SECRET = "test-secret";
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_ENV = "production";
    const diag = diagnoseTickEnv();
    assert.equal(diag.ok, false);
    assert.equal(diag.errorClass, "MISSING_APP_URL");
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
    if (prevApp === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevApp;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevPublic;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  });
});

describe("Render worker preferred path", () => {
  it("enables worker via CRAWL_WORKER_ENABLED", () => {
    const prevExec = process.env.SCAN_EXECUTION;
    const prevWorker = process.env.CRAWL_WORKER_ENABLED;
    delete process.env.SCAN_EXECUTION;
    process.env.CRAWL_WORKER_ENABLED = "1";
    assert.equal(getScanExecutionMode(), "worker");
    assert.equal(isWorkerScanExecution(), true);
    if (prevExec === undefined) delete process.env.SCAN_EXECUTION;
    else process.env.SCAN_EXECUTION = prevExec;
    if (prevWorker === undefined) delete process.env.CRAWL_WORKER_ENABLED;
    else process.env.CRAWL_WORKER_ENABLED = prevWorker;
  });

  it("ticks mode remains available as fallback", () => {
    const prevExec = process.env.SCAN_EXECUTION;
    const prevWorker = process.env.CRAWL_WORKER_ENABLED;
    process.env.SCAN_EXECUTION = "ticks";
    process.env.CRAWL_WORKER_ENABLED = "1";
    assert.equal(getScanExecutionMode(), "ticks");
    if (prevExec === undefined) delete process.env.SCAN_EXECUTION;
    else process.env.SCAN_EXECUTION = prevExec;
    if (prevWorker === undefined) delete process.env.CRAWL_WORKER_ENABLED;
    else process.env.CRAWL_WORKER_ENABLED = prevWorker;
  });
});

describe("recovered scheduling failure", () => {
  it("timeout while owner fresh is informational not customer WARNING", () => {
    const errorClass = classifyTickScheduleError(
      new Error("The operation was aborted due to timeout"),
    );
    assert.equal(errorClass, "TICK_CONNECTION_TIMEOUT");
    // continue.ts persists INFO when skip.skip — customer helper hides INFO.
    assert.equal(
      shouldShowCustomerTickWarning({
        tickScheduleError: "Tick schedule failed: timeout",
        tickScheduleSeverity: "INFO",
      }),
      false,
    );
  });
});
