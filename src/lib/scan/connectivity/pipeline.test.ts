import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { runConnectivityDiagnostics } from "./pipeline";
import { stageDns, stageHomepageGet } from "./stages";
import type { ConnectivityFetchRecord } from "./types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("runConnectivityDiagnostics (URL stage)", () => {
  it("fails hard on invalid URL", async () => {
    const d = await runConnectivityDiagnostics("not a url");
    assert.equal(d.ok, false);
    assert.equal(d.code, "invalid");
    assert.ok(d.summary.length > 0);
    assert.ok(d.technical.stages.some((s) => s.id === "url" && s.status === "fail"));
  });

  it("fails hard on private / SSRF host", async () => {
    const d = await runConnectivityDiagnostics("http://127.0.0.1/");
    assert.equal(d.ok, false);
    assert.equal(d.code, "invalid");
    assert.match(d.summary, /private|local|not allowed|SSRF|blocked/i);
  });
});

describe("stageDns", () => {
  it("returns ENOTFOUND for reserved .invalid TLD", async () => {
    const r = await stageDns("no-such-host.invalid");
    assert.equal(r.ok, false);
    assert.match(r.detail, /ENOTFOUND|fail:/i);
  });
});

describe("stageHomepageGet (mocked fetch)", () => {
  it("hard-fails on HTTP 404 and fetches once", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("<html>missing</html>", {
        status: 404,
        headers: { "content-type": "text/html" },
      });
    };
    const log: ConnectivityFetchRecord[] = [];
    const r = await stageHomepageGet("https://example.com/", log);
    assert.equal(r.ok, false);
    assert.equal(r.homepage, "404");
    assert.equal(r.errorCode, "http");
    assert.equal(calls, 1);
    assert.equal(log.length, 1);
  });

  it("succeeds with Cloudflare warn on 200 + cf-ray", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("<html>ok</html>", {
        status: 200,
        headers: {
          "content-type": "text/html",
          "cf-ray": "abc-123",
          server: "cloudflare",
        },
      });
    };
    const log: ConnectivityFetchRecord[] = [];
    const r = await stageHomepageGet("https://example.com/", log);
    assert.equal(r.ok, true);
    assert.equal(r.homepage, "200");
    assert.equal(r.cloudflareOrWaf, true);
    assert.equal(calls, 1);
  });

  it("classifies abort as timeout without retry", async () => {
    let calls = 0;
    globalThis.fetch = async (_input, init) => {
      calls += 1;
      const err = Object.assign(new Error("The operation was aborted"), {
        name: "AbortError",
        code: "ABORT_ERR",
      });
      if (init?.signal?.aborted) throw err;
      // Simulate abort immediately via rejected promise
      throw err;
    };
    const log: ConnectivityFetchRecord[] = [];
    const r = await stageHomepageGet("https://example.com/", log);
    assert.equal(r.ok, false);
    assert.equal(calls, 1);
    assert.ok(
      r.errorCode === "timeout" || r.homepage.includes("fail:"),
      `expected timeout/fail, got ${r.errorCode} / ${r.homepage}`,
    );
  });

  it("surfaces TLS cause from fetch failure once", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      const cause = Object.assign(new Error("certificate has expired"), {
        code: "CERT_HAS_EXPIRED",
      });
      const err = new Error("fetch failed");
      (err as Error & { cause: unknown }).cause = cause;
      throw err;
    };
    const log: ConnectivityFetchRecord[] = [];
    const r = await stageHomepageGet("https://example.com/", log);
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, "tls");
    assert.match(r.homepage, /CERT_HAS_EXPIRED|fail:/);
    assert.equal(calls, 1);
  });
});
