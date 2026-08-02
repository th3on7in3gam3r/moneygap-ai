import { crawlFinding } from "./finding";
import { crawlabilityStatus } from "./status";
import type {
  CrawlabilityContributors,
  CrawlabilityEvidence,
  CrawlabilityFinding,
  CrawlabilityResult,
} from "./types";

type Bucket = { points: number; max: number };

function emptyBucket(): Bucket {
  return { points: 0, max: 0 };
}

function add(b: Bucket, ok: boolean, weight: number) {
  b.max += weight;
  if (ok) b.points += weight;
}

function ratio(b: Bucket): number | null {
  if (b.max <= 0) return null;
  return Math.round((b.points / b.max) * 100);
}

export function scoreCrawlability(evidence: CrawlabilityEvidence): CrawlabilityResult {
  const findings: CrawlabilityFinding[] = [];
  const robotsB = emptyBucket();
  const sitemapB = emptyBucket();
  const canonicalB = emptyBucket();
  const linksB = emptyBucket();
  const redirectsB = emptyBucket();
  const indexB = emptyBucket();

  const { robots, sitemap, pages, llmsTxt, brokenInternal, orphans, maxDepth, urlConsistencyIssues, duplicateUrlGroups } =
    evidence;

  // —— Robots ——
  add(robotsB, robots.ok, 40);
  if (!robots.ok) {
    findings.push(
      crawlFinding({
        title: "Missing or unreachable robots.txt",
        problem: "robots.txt is missing or returned an error.",
        whyItMatters:
          "Clear crawl rules help search engines and AI systems discover public pages efficiently.",
        businessImpact:
          "Crawlers may miss guidance and discover converting pages more slowly.",
        estimatedOpportunity: 14000,
        confidence: 78,
        evidence: [`robots status: ${robots.status ?? "unreachable"}`],
        priority: "high",
        fixPath:
          "Publish a robots.txt that allows public marketing pages and references the sitemap.",
        difficulty: "easy",
        estimatedTime: "30–60 min",
        verificationSteps: [
          "GET /robots.txt returns 200",
          "Sitemap URL is listed",
          "Critical paths are not disallowed",
        ],
        contributor: "robots",
      }),
    );
  } else {
    add(robotsB, !robots.blocksAll && !robots.blocksHomepage, 45);
    if (robots.blocksAll || robots.blocksHomepage) {
      findings.push(
        crawlFinding({
          title: "robots.txt blocks homepage",
          problem: "User-agent * (or Googlebot) Disallow rules block /.",
          whyItMatters:
            "If the homepage is disallowed, search engines may be unable to crawl the site entry point.",
          businessImpact:
            "Search engines may be unable to crawl your site, collapsing organic discovery.",
          estimatedOpportunity: 45000,
          confidence: 92,
          evidence: [
            `Disallow paths: ${robots.disallowPaths.slice(0, 8).join(", ") || "(none listed)"}`,
            robots.blocksAll ? "Disallow: / blocks all" : "Homepage disallowed",
          ],
          priority: "critical",
          fixPath: "Allow crawling of public pages; remove Disallow: / for * / Googlebot.",
          difficulty: "easy",
          estimatedTime: "15–30 min",
          verificationSteps: [
            "robots.txt no longer Disallow: / for *",
            "URL Inspection / live crawl can fetch homepage",
          ],
          contributor: "robots",
        }),
      );
    }
    add(robotsB, robots.sitemapDirectives.length > 0, 15);
  }

  // —— Sitemap ——
  add(sitemapB, sitemap.ok, 30);
  if (!sitemap.ok) {
    findings.push(
      crawlFinding({
        title: "Sitemap Missing",
        problem: "sitemap.xml (or sitemap_index.xml) is missing or unreachable.",
        whyItMatters:
          "Sitemaps accelerate discovery of pricing, features, docs, and new content.",
        businessImpact:
          "Search engines may discover new pages more slowly.",
        estimatedOpportunity: 18000,
        confidence: 80,
        evidence: [`sitemap status: ${sitemap.status ?? "unreachable"}`],
        priority: "high",
        fixPath: "Generate and submit sitemap.xml covering indexable public URLs.",
        difficulty: "medium",
        estimatedTime: "2–4 hours",
        verificationSteps: [
          "GET /sitemap.xml returns 200",
          "Key routes appear in the sitemap",
          "Submit sitemap in Search Console when connected",
        ],
        contributor: "sitemap",
      }),
    );
  } else {
    add(sitemapB, sitemap.validXml, 25);
    if (!sitemap.validXml) {
      findings.push(
        crawlFinding({
          title: "XML sitemap validity issues",
          problem: "Sitemap response does not look like a valid urlset/sitemapindex with loc entries.",
          whyItMatters: "Invalid sitemaps are ignored, wasting crawl budget setup work.",
          businessImpact: "Indexation of new and deep pages may stall.",
          estimatedOpportunity: 12000,
          confidence: 75,
          evidence: [`urlCount=${sitemap.urlCount}`, `isIndex=${sitemap.isIndex}`],
          priority: "high",
          fixPath: "Fix XML structure so each URL has a <loc> inside urlset or sitemapindex.",
          difficulty: "medium",
          estimatedTime: "1–3 hours",
          verificationSteps: ["Sitemap validates in an XML checker", "locs resolve to 200"],
          contributor: "sitemap",
        }),
      );
    }
    add(sitemapB, sitemap.urlCount >= 3, 20);
    if (sitemap.fresh === false) {
      add(sitemapB, false, 15);
      findings.push(
        crawlFinding({
          title: "Sitemap freshness lag",
          problem: "No lastmod within the last ~90 days was detected in the sitemap sample.",
          whyItMatters: "Stale lastmod signals can slow re-discovery of updated offer pages.",
          businessImpact: "Updated product/pricing pages may take longer to re-index.",
          estimatedOpportunity: 6000,
          confidence: 55,
          evidence: [`lastmod sample: ${sitemap.lastmodDates.slice(0, 3).join(", ") || "none"}`],
          priority: "medium",
          fixPath: "Ensure lastmod updates when public pages change; regenerate sitemap on deploy.",
          difficulty: "easy",
          estimatedTime: "1–2 hours",
          verificationSteps: ["Recent lastmod on changed URLs"],
          contributor: "sitemap",
        }),
      );
    } else if (sitemap.fresh === true) {
      add(sitemapB, true, 15);
    } else {
      add(sitemapB, true, 8); // lastmod optional
    }
    add(sitemapB, sitemap.urlCount > 0, 10);
  }

  // —— Pages: canonical / indexability / redirects / links ——
  const okPages = pages.filter((p) => p.status === 200 && p.htmlLength > 0);
  if (pages.length === 0) {
    return {
      score: null,
      status: null,
      contributors: {
        robots: ratio(robotsB),
        sitemap: ratio(sitemapB),
        canonical: null,
        internalLinks: null,
        redirects: null,
        indexability: null,
      },
      findings,
      unavailableReasons: {
        pages: "No pages could be fetched for crawlability analysis.",
      },
      executiveSummary:
        "Crawlability could not be fully scored because no HTML pages were reachable.",
      estimatedImprovement: "Restore crawl access, then re-run the scan.",
      evidence,
    };
  }

  for (const page of pages) {
    if (page.redirectLoop) {
      add(redirectsB, false, 20);
      findings.push(
        crawlFinding({
          title: "Redirect loop detected",
          problem: `Redirect loop while requesting ${page.url}.`,
          whyItMatters: "Loops waste crawl budget and block indexing of the destination.",
          businessImpact: "Affected URLs will not rank or convert from organic/AI discovery.",
          estimatedOpportunity: 20000,
          confidence: 90,
          evidence: page.redirectChain.map(
            (h) => `${h.status} ${h.url} → ${h.location ?? ""}`,
          ),
          priority: "critical",
          fixPath: "Break the loop; point each hop to a single final 200 URL.",
          difficulty: "medium",
          estimatedTime: "1–3 hours",
          verificationSteps: [`${page.url} resolves to a single 200 without looping`],
          pageUrl: page.url,
          contributor: "redirects",
        }),
      );
    } else if (page.redirectChain.length >= 3) {
      add(redirectsB, false, 12);
      findings.push(
        crawlFinding({
          title: "Redirect chain",
          problem: `Long redirect chain (${page.redirectChain.length} hops) from ${page.url}.`,
          whyItMatters:
            "Long redirect chains waste crawl budget and slow page loading.",
          businessImpact:
            "Crawl efficiency drops; equity and speed degrade on key paths.",
          estimatedOpportunity: 8000,
          confidence: 82,
          evidence: page.redirectChain.map(
            (h) => `${h.status} ${h.url} → ${h.location ?? ""}`,
          ),
          priority: "medium",
          fixPath: "Update links to point directly to the final destination.",
          difficulty: "easy",
          estimatedTime: "30–90 min",
          verificationSteps: ["Single hop or direct 200 from internal links"],
          pageUrl: page.url,
          contributor: "redirects",
        }),
      );
    } else if (page.redirectChain.length > 0) {
      add(redirectsB, true, 8);
    } else {
      add(redirectsB, true, 10);
    }

    if (page.status != null && page.status >= 400) {
      add(linksB, false, 8);
      findings.push(
        crawlFinding({
          title: `HTTP ${page.status} on ${page.url}`,
          problem: `Page returned status ${page.status}.`,
          whyItMatters: "Broken URLs waste crawl budget and erode trust mid-journey.",
          businessImpact: "Dead URLs leak SEO equity and confuse buyers.",
          estimatedOpportunity: 7000,
          confidence: 85,
          evidence: [`URL ${page.url}`, `status ${page.status}`],
          priority: page.status === 404 ? "high" : "medium",
          fixPath: "Fix routing or redirect to the correct live page.",
          difficulty: "medium",
          estimatedTime: "1–3 hours",
          verificationSteps: [`GET ${page.url} returns 200`],
          pageUrl: page.url,
          contributor: "internalLinks",
        }),
      );
      continue;
    }

    if (page.soft404Suspect) {
      add(indexB, false, 10);
      findings.push(
        crawlFinding({
          title: "Soft 404 suspect",
          problem: `HTTP 200 response looks like a missing page (${page.url}).`,
          whyItMatters: "Soft 404s keep thin/error pages in the index and dilute quality signals.",
          businessImpact: "Crawl and ranking signals may attach to worthless URLs.",
          estimatedOpportunity: 9000,
          confidence: 62,
          evidence: [
            `title: ${page.title ?? "(empty)"}`,
            `htmlLength: ${page.htmlLength}`,
          ],
          priority: "high",
          fixPath: "Return a real 404/410 or replace with substantive content + noindex if needed.",
          difficulty: "medium",
          estimatedTime: "1–4 hours",
          verificationSteps: ["Status and body match intent", "No soft-404 copy on 200"],
          pageUrl: page.url,
          contributor: "indexability",
        }),
      );
    } else {
      add(indexB, true, 6);
    }

    const canonicalOk = Boolean(page.canonical);
    add(canonicalB, canonicalOk, 8);
    if (!canonicalOk && page.status === 200) {
      findings.push(
        crawlFinding({
          title: "Missing canonical URL",
          problem: `No rel=canonical on ${page.url}.`,
          whyItMatters: "Canonicals consolidate duplicate URL signals for crawlers.",
          businessImpact: "Duplicate variants can split ranking equity.",
          estimatedOpportunity: 5000,
          confidence: 70,
          evidence: [page.url],
          priority: "medium",
          fixPath: "Add an absolute self-referencing canonical for each indexable page.",
          difficulty: "easy",
          estimatedTime: "30–60 min",
          verificationSteps: ["View source shows canonical", "Matches preferred URL"],
          pageUrl: page.url,
          contributor: "canonical",
        }),
      );
    } else if (page.canonical) {
      try {
        const can = new URL(page.canonical, page.finalUrl);
        const self = new URL(page.finalUrl);
        const conflict =
          can.pathname.replace(/\/$/, "") !== self.pathname.replace(/\/$/, "") &&
          can.origin === self.origin;
        add(canonicalB, !conflict, 6);
        if (conflict) {
          findings.push(
            crawlFinding({
              title: "Canonical conflict",
              problem: `Canonical ${page.canonical} differs from fetched URL ${page.finalUrl}.`,
              whyItMatters: "Conflicts confuse which URL should rank.",
              businessImpact: "Wrong page may win (or neither) in search results.",
              estimatedOpportunity: 10000,
              confidence: 74,
              evidence: [`canonical=${page.canonical}`, `fetched=${page.finalUrl}`],
              priority: "high",
              fixPath: "Align canonical with the preferred indexable URL or 301 the variant.",
              difficulty: "medium",
              estimatedTime: "1–2 hours",
              verificationSteps: ["Canonical matches preferred URL"],
              pageUrl: page.url,
              contributor: "canonical",
            }),
          );
        }
      } catch {
        add(canonicalB, false, 4);
      }
    }

    const robotsMeta = `${page.metaRobots ?? ""} ${page.xRobotsTag ?? ""}`.toLowerCase();
    const noindex = /\bnoindex\b/.test(robotsMeta);
    add(indexB, !noindex || /\/(sign-in|sign-up|dashboard|api)\b/i.test(page.url), 8);
    if (noindex && !/\/(sign-in|sign-up|dashboard|invite|share)\b/i.test(page.url)) {
      findings.push(
        crawlFinding({
          title: "noindex on public page",
          problem: `Meta robots or X-Robots-Tag includes noindex on ${page.url}.`,
          whyItMatters: "noindex removes the URL from search visibility.",
          businessImpact: "Public marketing pages may be excluded from organic discovery.",
          estimatedOpportunity: 15000,
          confidence: 88,
          evidence: [
            page.metaRobots ? `meta robots: ${page.metaRobots}` : "",
            page.xRobotsTag ? `X-Robots-Tag: ${page.xRobotsTag}` : "",
          ].filter(Boolean),
          priority: "critical",
          fixPath: "Remove noindex from public pages that should rank.",
          difficulty: "easy",
          estimatedTime: "15–45 min",
          verificationSteps: ["View source / headers show index,follow"],
          pageUrl: page.url,
          contributor: "indexability",
        }),
      );
    } else {
      add(indexB, true, 4);
    }

    add(indexB, page.https, 6);
    if (!page.https) {
      findings.push(
        crawlFinding({
          title: "HTTP (non-HTTPS) URL",
          problem: `${page.url} is not served over HTTPS.`,
          whyItMatters: "HTTPS is a baseline trust and crawl preference signal.",
          businessImpact: "Browsers and crawlers prefer secure URLs; mixed hosts fragment equity.",
          estimatedOpportunity: 8000,
          confidence: 85,
          evidence: [page.url],
          priority: "high",
          fixPath: "Force HTTPS and 301 HTTP → HTTPS sitewide.",
          difficulty: "medium",
          estimatedTime: "1–4 hours",
          verificationSteps: ["HTTP redirects to HTTPS", "No mixed content warnings"],
          pageUrl: page.url,
          contributor: "indexability",
        }),
      );
    }

    add(linksB, page.internalHrefs.length >= 2 || page.url.endsWith("/"), 5);
    add(indexB, page.hasNav, 4);
    add(indexB, page.hasBreadcrumbJsonLd || page.hasBreadcrumbMarkup, 3);
    add(indexB, page.jsonLdTypes.length > 0, 5);

    if (page.scriptHeavy) {
      add(indexB, false, 5);
      findings.push(
        crawlFinding({
          title: "JavaScript-heavy / thin HTML shell",
          problem: `${page.url} has many scripts with relatively thin initial HTML.`,
          whyItMatters:
            "Some crawlers and AI systems struggle when critical content depends on client rendering.",
          businessImpact: "Key offers may be under-discovered if content is not in initial HTML.",
          estimatedOpportunity: 7000,
          confidence: 55,
          evidence: [`htmlLength=${page.htmlLength}`, page.url],
          priority: "medium",
          fixPath: "SSR or prerender critical marketing content; keep main copy in HTML.",
          difficulty: "hard",
          estimatedTime: "1–5 days",
          verificationSteps: ["View-source shows primary copy", "Fetch as Google shows content"],
          pageUrl: page.url,
          contributor: "indexability",
        }),
      );
    } else {
      add(indexB, true, 3);
    }

    if (page.hreflang.length > 0) {
      add(indexB, page.hreflang.length >= 2, 3);
    }
  }

  add(linksB, brokenInternal.length === 0, 20);
  if (brokenInternal.length > 0) {
    findings.push(
      crawlFinding({
        title: "Broken internal links",
        problem: `${brokenInternal.length} sampled internal link(s) returned errors.`,
        whyItMatters: "Broken internal links waste crawl budget and strand users.",
        businessImpact: "Equity and journeys leak before conversion.",
        estimatedOpportunity: 10000,
        confidence: 80,
        evidence: brokenInternal
          .slice(0, 5)
          .map((b) => `${b.from} → ${b.to} (${b.status ?? "error"})`),
        priority: "high",
        fixPath: "Update or remove broken internal hrefs; fix destinations.",
        difficulty: "medium",
        estimatedTime: "2–6 hours",
        verificationSteps: ["Sampled internal links return 200"],
        contributor: "internalLinks",
      }),
    );
  }

  add(linksB, orphans.length <= 2, 12);
  if (orphans.length > 2) {
    findings.push(
      crawlFinding({
        title: "Orphan pages",
        problem: `${orphans.length} sitemap/catalog URLs lack inbound links from probed pages.`,
        whyItMatters: "Orphans are hard for crawlers to discover without sitemap reliance alone.",
        businessImpact: "Important pages may stay under-crawled and under-ranked.",
        estimatedOpportunity: 11000,
        confidence: 60,
        evidence: orphans.slice(0, 8),
        priority: "medium",
        fixPath: "Add contextual internal links and nav/footer paths to orphan URLs.",
        difficulty: "medium",
        estimatedTime: "2–8 hours",
        verificationSteps: ["Each key URL has ≥1 inbound internal link"],
        contributor: "internalLinks",
      }),
    );
  }

  if (maxDepth != null && maxDepth > 4) {
    add(linksB, false, 8);
    findings.push(
      crawlFinding({
        title: "Deep crawl depth",
        problem: `Internal link graph depth from home reached ~${maxDepth} among probed pages.`,
        whyItMatters: "Deep URLs receive less crawl attention and weaker equity flow.",
        businessImpact: "Money pages buried deep convert less from organic discovery.",
        estimatedOpportunity: 6000,
        confidence: 58,
        evidence: [`maxDepth≈${maxDepth}`],
        priority: "medium",
        fixPath: "Promote high-value pages closer to home via nav and hub links.",
        difficulty: "medium",
        estimatedTime: "4–12 hours",
        verificationSteps: ["Key URLs reachable within 3 clicks"],
        contributor: "internalLinks",
      }),
    );
  } else if (maxDepth != null) {
    add(linksB, true, 8);
  }

  add(indexB, urlConsistencyIssues.length === 0, 8);
  if (urlConsistencyIssues.length > 0) {
    findings.push(
      crawlFinding({
        title: "URL consistency issues",
        problem: "Mixed host or protocol variants detected among probed pages.",
        whyItMatters: "Inconsistent URLs fragment crawl signals and analytics.",
        businessImpact: "Ranking equity and reporting split across duplicates.",
        estimatedOpportunity: 7000,
        confidence: 72,
        evidence: urlConsistencyIssues.slice(0, 6),
        priority: "medium",
        fixPath: "Pick one preferred host/protocol; 301 all variants.",
        difficulty: "medium",
        estimatedTime: "2–6 hours",
        verificationSteps: ["Single host + HTTPS preferred"],
        contributor: "indexability",
      }),
    );
  }

  if (duplicateUrlGroups.length > 0) {
    add(canonicalB, false, 8);
    findings.push(
      crawlFinding({
        title: "Duplicate URL variants",
        problem: "Multiple URL variants resolve for the same path among probed pages.",
        whyItMatters: "Duplicates dilute crawl and ranking signals.",
        businessImpact: "Organic visibility underperforms relative to effort.",
        estimatedOpportunity: 6500,
        confidence: 68,
        evidence: duplicateUrlGroups.slice(0, 3).map((g) => g.join(" | ")),
        priority: "medium",
        fixPath: "Canonicalize and redirect duplicate variants to one URL.",
        difficulty: "medium",
        estimatedTime: "2–4 hours",
        verificationSteps: ["One preferred URL per page"],
        contributor: "canonical",
      }),
    );
  } else {
    add(canonicalB, true, 4);
  }

  add(indexB, llmsTxt.ok, 6);
  if (!llmsTxt.ok) {
    findings.push(
      crawlFinding({
        title: "Missing llms.txt (AI discoverability)",
        problem: "/llms.txt is missing or too thin for AI crawlers.",
        whyItMatters:
          "AI systems increasingly use site-level guidance files to understand products.",
        businessImpact: "Weaker AI-assisted discovery of Money Gaps positioning and key URLs.",
        estimatedOpportunity: 5000,
        confidence: 50,
        evidence: [`llms.txt status: ${llmsTxt.status ?? "unreachable"}`],
        priority: "low",
        fixPath: "Publish llms.txt summarizing the product and canonical public URLs.",
        difficulty: "easy",
        estimatedTime: "30–90 min",
        verificationSteps: ["GET /llms.txt returns useful plain text"],
        contributor: "indexability",
      }),
    );
  }

  const contributors: CrawlabilityContributors = {
    robots: ratio(robotsB),
    sitemap: ratio(sitemapB),
    canonical: ratio(canonicalB),
    internalLinks: ratio(linksB),
    redirects: ratio(redirectsB),
    indexability: ratio(indexB),
  };

  const parts = Object.values(contributors).filter((n): n is number => n != null);
  const score =
    parts.length === 0
      ? null
      : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  const status = crawlabilityStatus(score);
  const critical = findings.filter((f) => f.priority === "critical").length;
  const high = findings.filter((f) => f.priority === "high").length;

  const executiveSummary =
    score == null
      ? "Crawlability Score™ could not be computed from available evidence."
      : `Crawlability Score™ is ${score}/100 (${status}). ${okPages.length}/${pages.length} pages returned 200. ${
          critical + high > 0
            ? `${critical} critical and ${high} high-priority crawl issues need Fix Paths™ first.`
            : "No critical crawl blockers detected in this sample."
        }`;

  const estimatedImprovement =
    score == null
      ? "Re-run after pages are reachable."
      : score >= 90
        ? "Maintain hygiene; monitor redirects and sitemap freshness."
        : `Closing top ${Math.min(3, findings.length)} issues could lift Crawlability Score™ toward the next status band (AI Estimate — not a guarantee).`;

  return {
    score,
    status,
    contributors,
    findings,
    unavailableReasons: {},
    executiveSummary,
    estimatedImprovement,
    evidence,
  };
}
