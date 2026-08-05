import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyNetworkError } from "./classify-error";
import { detectCloudflareOrWaf } from "./waf";
import { summaryForFailure } from "./messages";

describe("classifyNetworkError", () => {
  it("classifies DNS ENOTFOUND", () => {
    const err = Object.assign(new Error("getaddrinfo ENOTFOUND example.invalid"), {
      code: "ENOTFOUND",
    });
    const c = classifyNetworkError(err);
    assert.equal(c.kind, "dns");
    assert.match(c.code, /ENOTFOUND/i);
  });

  it("classifies TLS certificate errors via cause chain", () => {
    const cause = Object.assign(new Error("certificate has expired"), {
      code: "CERT_HAS_EXPIRED",
    });
    const err = new Error("fetch failed");
    (err as Error & { cause: unknown }).cause = cause;
    const c = classifyNetworkError(err);
    assert.equal(c.kind, "tls");
  });

  it("classifies timeouts with reason", () => {
    const err = Object.assign(new Error("Connect Timeout Error"), {
      code: "UND_ERR_CONNECT_TIMEOUT",
      name: "ConnectTimeoutError",
    });
    const c = classifyNetworkError(err);
    assert.equal(c.kind, "timeout");
    assert.equal(c.timeoutReason, "connect_timeout");
  });

  it("classifies connection refused", () => {
    const err = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    });
    const c = classifyNetworkError(err);
    assert.equal(c.kind, "refused");
  });

  it("does not collapse TLS into generic network", () => {
    const err = Object.assign(new Error("unable to verify the first certificate"), {
      code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    });
    const c = classifyNetworkError(err);
    assert.equal(c.kind, "tls");
    assert.notEqual(c.kind, "network");
  });
});

describe("detectCloudflareOrWaf", () => {
  it("detects cf-ray header", () => {
    const headers = new Headers({ "cf-ray": "abc", server: "cloudflare" });
    const r = detectCloudflareOrWaf(headers, "<html></html>");
    assert.equal(r.detected, true);
  });

  it("detects challenge body", () => {
    const headers = new Headers();
    const r = detectCloudflareOrWaf(
      headers,
      "<html>Just a moment... cf-browser-verification</html>",
    );
    assert.equal(r.detected, true);
    assert.ok(r.warning);
  });
});

describe("summaryForFailure", () => {
  it("includes exact TLS detail", () => {
    const s = summaryForFailure("tls", "CERT_HAS_EXPIRED", "example.com");
    assert.match(s, /CERT_HAS_EXPIRED/);
    assert.match(s, /TLS|certificate/i);
  });

  it("includes DNS domain", () => {
    const s = summaryForFailure("dns", "ENOTFOUND", "bad.example");
    assert.match(s, /bad\.example/);
    assert.match(s, /ENOTFOUND/);
  });
});

describe("loggedFetch no-retry contract", () => {
  it("documents single-attempt policy (no withRetry wrapper)", async () => {
    const fs = await import("node:fs/promises");
    const path = new URL("./fetch-log.ts", import.meta.url);
    const src = await fs.readFile(path, "utf8");
    assert.equal(src.includes("withRetry"), false);
    assert.equal(/attempts\s*[<>=]/.test(src), false);
  });
});
