import { validateAndNormalizeUrl } from "@/lib/analysis/url-normalize";
import { log } from "@/lib/observability/logger";
import { finalizeSummary } from "./messages";
import {
  countHomepageLinks,
  detectFrameworkSafe,
  stageDns,
  stageHomepageGet,
  stageRobots,
  stageSitemap,
  stageTcp,
  stageTls,
} from "./stages";
import type {
  ConnectivityDiagnostics,
  ConnectivityErrorCode,
  ConnectivityFetchRecord,
  ConnectivityStageRecord,
} from "./types";

/**
 * Staged connectivity diagnostics — single pass, no retries.
 * Foundation for Pre-Scan Estimator.
 */
export async function runConnectivityDiagnostics(
  rawUrl: string,
): Promise<ConnectivityDiagnostics> {
  const fetches: ConnectivityFetchRecord[] = [];
  const stages: ConnectivityStageRecord[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const base: ConnectivityDiagnostics = {
    url: rawUrl.trim(),
    finalUrl: null,
    dns: "skip",
    tcp: "skip",
    tls: "skip",
    redirect: null,
    homepage: "skip",
    robots: "skip",
    sitemap: "skip",
    cloudflareOrWaf: false,
    detectedFramework: null,
    estimatedPages: null,
    warnings,
    errors,
    summary: "",
    technical: { stages, fetches },
    ok: false,
  };

  // 1. URL syntax + SSRF
  const urlStarted = Date.now();
  const validated = validateAndNormalizeUrl(rawUrl);
  if (!validated.ok) {
    stages.push({
      id: "url",
      status: "fail",
      detail: validated.error,
      elapsedMs: Date.now() - urlStarted,
    });
    errors.push(validated.error);
    base.code = "invalid";
    base.summary = finalizeSummary(base);
    log("warn", "connectivity_diagnostics", {
      ok: false,
      code: "invalid",
      url: rawUrl,
    });
    return base;
  }

  const value = validated.value;
  base.url = value.href;
  base.value = value;
  stages.push({
    id: "url",
    status: "success",
    detail: value.href,
    elapsedMs: Date.now() - urlStarted,
  });

  // 2. DNS
  const dns = await stageDns(value.hostname);
  base.dns = dns.ok ? "success" : dns.detail;
  stages.push({
    id: "dns",
    status: dns.ok ? "success" : "fail",
    detail: dns.detail,
    elapsedMs: dns.elapsedMs,
  });
  if (!dns.ok) {
    errors.push(dns.detail.replace(/^fail:\s*/, ""));
    base.code = "dns";
    base.summary = finalizeSummary(base);
    log("warn", "connectivity_diagnostics", {
      ok: false,
      code: "dns",
      url: value.href,
      dns: base.dns,
    });
    return base;
  }

  const port = 443;

  // 3. TCP
  const tcp = await stageTcp(value.hostname, port);
  base.tcp = tcp.ok ? "success" : tcp.detail;
  stages.push({
    id: "tcp",
    status: tcp.ok ? "success" : "fail",
    detail: tcp.detail,
    elapsedMs: tcp.elapsedMs,
  });
  if (!tcp.ok) {
    errors.push(tcp.detail.replace(/^fail:\s*/, ""));
    base.code = tcp.code === "ETIMEDOUT" ? "timeout" : "tcp";
    base.summary = finalizeSummary(base);
    log("warn", "connectivity_diagnostics", {
      ok: false,
      code: base.code,
      url: value.href,
      tcp: base.tcp,
    });
    return base;
  }

  // 4. TLS
  const tls = await stageTls(value.hostname, port);
  base.tls = tls.ok ? "success" : tls.detail;
  stages.push({
    id: "tls",
    status: tls.ok ? "success" : "fail",
    detail: tls.detail,
    elapsedMs: tls.elapsedMs,
  });
  if (!tls.ok) {
    errors.push(tls.detail.replace(/^fail:\s*/, ""));
    base.code = tls.code === "ETIMEDOUT" ? "timeout" : "tls";
    base.summary = finalizeSummary(base);
    log("warn", "connectivity_diagnostics", {
      ok: false,
      code: base.code,
      url: value.href,
      tls: base.tls,
    });
    return base;
  }

  // 5–7. Homepage GET + redirects + WAF
  const home = await stageHomepageGet(value.href, fetches);
  base.homepage = home.homepage;
  base.finalUrl = home.finalUrl;
  base.redirect = home.redirect;
  base.cloudflareOrWaf = home.cloudflareOrWaf;
  stages.push(...home.stages);
  if (home.redirect) {
    stages.push({
      id: "redirect",
      status: "success",
      detail: home.redirect,
      elapsedMs: 0,
    });
  }
  if (home.wafWarning) {
    warnings.push(home.wafWarning);
    stages.push({
      id: "waf",
      status: "warn",
      detail: home.wafWarning,
      elapsedMs: 0,
    });
  } else {
    stages.push({
      id: "waf",
      status: home.cloudflareOrWaf ? "warn" : "success",
      detail: home.cloudflareOrWaf ? "detected" : "none",
      elapsedMs: 0,
    });
  }

  if (!home.ok) {
    if (home.hardError) errors.push(home.hardError);
    base.code = (home.errorCode ?? "unreachable") as ConnectivityErrorCode;
    base.summary = finalizeSummary(base);
    log("warn", "connectivity_diagnostics", {
      ok: false,
      code: base.code,
      url: value.href,
      homepage: base.homepage,
    });
    return base;
  }

  const origin = home.finalUrl
    ? new URL(home.finalUrl).origin
    : value.origin;

  // 8. robots.txt (soft)
  const robots = await stageRobots(origin, fetches);
  base.robots = robots.status;
  stages.push({
    id: "robots",
    status: robots.status === "200" || robots.status.startsWith("2")
      ? "success"
      : robots.status === "404"
        ? "warn"
        : "warn",
    detail: robots.status,
    elapsedMs: 0,
  });
  if (robots.status === "404") {
    warnings.push("robots.txt not found (404).");
  } else if (robots.status.startsWith("fail:")) {
    warnings.push(`robots.txt check failed (${robots.status}).`);
  }

  // 9. sitemap (soft)
  const sitemap = await stageSitemap(origin, robots.sitemapHints, fetches);
  base.sitemap = sitemap.status;
  stages.push({
    id: "sitemap",
    status:
      sitemap.status === "200" || sitemap.status.startsWith("2")
        ? "success"
        : "warn",
    detail:
      sitemap.urlCount > 0
        ? `${sitemap.status} (${sitemap.urlCount} URLs)`
        : sitemap.status,
    elapsedMs: 0,
  });
  if (sitemap.status === "404") {
    warnings.push("sitemap.xml not found (404).");
  } else if (sitemap.status.startsWith("fail:")) {
    warnings.push(`sitemap check failed (${sitemap.status}).`);
  }

  // 10. Framework + page estimate
  const framework = await detectFrameworkSafe(home.bodyText);
  base.detectedFramework = framework;
  const linkCount = countHomepageLinks(home.bodyText, origin);
  base.homepageLinkCount = linkCount;
  base.sitemapUrlCount = sitemap.urlCount;
  base.estimatedPages = Math.max(sitemap.urlCount || 0, linkCount || 1, 1);
  stages.push({
    id: "framework",
    status: framework ? "success" : "warn",
    detail: framework ?? "unknown",
    elapsedMs: 0,
  });

  base.ok = true;
  base.summary = finalizeSummary(base);
  log("info", "connectivity_diagnostics", {
    ok: true,
    url: value.href,
    finalUrl: base.finalUrl,
    dns: base.dns,
    tls: base.tls,
    homepage: base.homepage,
    robots: base.robots,
    sitemap: base.sitemap,
    framework: base.detectedFramework,
    estimatedPages: base.estimatedPages,
    warningCount: warnings.length,
    fetchCount: fetches.length,
  });
  return base;
}
