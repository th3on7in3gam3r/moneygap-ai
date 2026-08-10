import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getScanExecutionMode,
  isWorkerScanExecution,
} from "./execution";

describe("scan execution mode", () => {
  it("defaults to ticks unless worker is enabled", () => {
    const prevExec = process.env.SCAN_EXECUTION;
    const prevWorker = process.env.CRAWL_WORKER_ENABLED;
    delete process.env.SCAN_EXECUTION;
    delete process.env.CRAWL_WORKER_ENABLED;
    assert.equal(getScanExecutionMode(), "ticks");
    assert.equal(isWorkerScanExecution(), false);
    process.env.SCAN_EXECUTION = prevExec;
    process.env.CRAWL_WORKER_ENABLED = prevWorker;
  });

  it("enables worker via CRAWL_WORKER_ENABLED=1", () => {
    const prevExec = process.env.SCAN_EXECUTION;
    const prevWorker = process.env.CRAWL_WORKER_ENABLED;
    delete process.env.SCAN_EXECUTION;
    process.env.CRAWL_WORKER_ENABLED = "1";
    assert.equal(getScanExecutionMode(), "worker");
    assert.equal(isWorkerScanExecution(), true);
    process.env.SCAN_EXECUTION = prevExec;
    process.env.CRAWL_WORKER_ENABLED = prevWorker;
  });

  it("honors explicit SCAN_EXECUTION override", () => {
    const prevExec = process.env.SCAN_EXECUTION;
    const prevWorker = process.env.CRAWL_WORKER_ENABLED;
    process.env.CRAWL_WORKER_ENABLED = "1";
    process.env.SCAN_EXECUTION = "ticks";
    assert.equal(getScanExecutionMode(), "ticks");
    process.env.SCAN_EXECUTION = prevExec;
    process.env.CRAWL_WORKER_ENABLED = prevWorker;
  });
});
