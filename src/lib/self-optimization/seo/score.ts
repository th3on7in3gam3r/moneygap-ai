import type { PageSeoSnapshot, ScoreResult, SelfOptFindingInput, SiteFilesResult } from "../types";

function finding(
  partial: Omit<SelfOptFindingInput, "estimateLabeled"> & {
    estimateLabeled?: string;
  },
): SelfOptFindingInput {
  return {
    ...partial,
    estimateLabeled: partial.estimateLabeled ?? "AI Estimate",
  };
}

export function scoreSeo(
  pages: PageSeoSnapshot[],
  site: SiteFilesResult,
): ScoreResult {
  const findings: SelfOptFindingInput[] = [];
  if (pages.length === 0) {
    return {
      score: null,
      unavailableReason: "No pages could be fetched for SEO analysis.",
      findings: [],
    };
  }

  let points = 0;
  let max = 0;

  const add = (ok: boolean, weight: number) => {
    max += weight;
    if (ok) points += weight;
  };

  add(site.robotsOk, 8);
  if (!site.robotsOk) {
    findings.push(
      finding({
        category: "seo",
        title: "Missing or unreachable robots.txt",
        problem: "robots.txt is missing or returned an error.",
        businessImpact:
          "Crawlers may miss crawl guidance, slowing discovery of key pages.",
        whyItMatters:
          "Clear crawl rules improve indexation of high-intent pages that drive signups.",
        estimatedOpportunity: 12000,
        confidence: 70,
        evidence: [
          `robots status: ${site.robotsStatus ?? "unreachable"}`,
        ],
        fixPath:
          "Add a robots.txt that allows public marketing pages and references the sitemap.",
        difficulty: "easy",
        estimatedTime: "30–60 min",
        verificationSteps: [
          "GET /robots.txt returns 200",
          "Sitemap URL is listed",
          "Critical paths are not disallowed",
        ],
      }),
    );
  }

  add(site.sitemapOk, 10);
  if (!site.sitemapOk) {
    findings.push(
      finding({
        category: "seo",
        title: "Missing or unreachable sitemap.xml",
        problem: "sitemap.xml (or sitemap_index.xml) is missing or errored.",
        businessImpact:
          "Search engines discover fewer URLs, reducing organic traffic potential.",
        whyItMatters:
          "Sitemaps accelerate indexing of pricing, features, and docs that convert.",
        estimatedOpportunity: 18000,
        confidence: 75,
        evidence: [`sitemap status: ${site.sitemapStatus ?? "unreachable"}`],
        fixPath:
          "Publish an XML sitemap covering all indexable marketing and docs URLs.",
        difficulty: "medium",
        estimatedTime: "2–4 hours",
        verificationSteps: [
          "GET /sitemap.xml returns 200",
          "Key routes appear in the sitemap",
          "Submit sitemap in Search Console",
        ],
      }),
    );
  }

  for (const page of pages) {
    if (page.status !== 200 || page.htmlLength === 0) {
      findings.push(
        finding({
          category: "seo",
          title: `Unreachable page: ${page.url}`,
          problem: `Page returned status ${page.status ?? "timeout/error"}.`,
          businessImpact: "Broken or missing pages waste crawl budget and trust.",
          whyItMatters: "Dead URLs leak SEO equity and confuse buyers mid-journey.",
          estimatedOpportunity: 5000,
          confidence: 80,
          evidence: [`URL ${page.url}`, `status ${page.status ?? "n/a"}`],
          fixPath: "Fix routing or publish the intended page at this path.",
          difficulty: "medium",
          estimatedTime: "1–3 hours",
          verificationSteps: [`GET ${page.url} returns 200`],
          pageUrl: page.url,
        }),
      );
      continue;
    }

    add(Boolean(page.title && page.title.length >= 10), 6);
    if (!page.title || page.title.length < 10) {
      findings.push(
        finding({
          category: "seo",
          title: "Weak or missing title tag",
          problem: "Title tag is missing or too short to describe the offer.",
          businessImpact: "Lower CTR from SERPs reduces traffic to conversion pages.",
          whyItMatters: "Titles are the primary SERP hook for MoneyGap queries.",
          estimatedOpportunity: 8000,
          confidence: 72,
          evidence: [`title: ${page.title ?? "(empty)"}`, page.url],
          fixPath:
            "Write a unique 50–60 character title with product benefit + brand.",
          difficulty: "easy",
          estimatedTime: "30 min",
          verificationSteps: ["View source shows a unique <title>", "SERP preview looks clear"],
          pageUrl: page.url,
        }),
      );
    }

    add(Boolean(page.metaDescription && page.metaDescription.length >= 50), 6);
    if (!page.metaDescription || page.metaDescription.length < 50) {
      findings.push(
        finding({
          category: "metadata",
          title: "Weak or missing meta description",
          problem: "Meta description is missing or under 50 characters.",
          businessImpact: "SERP snippets underperform, lowering click-through.",
          whyItMatters: "Descriptions sell the click before the page loads.",
          estimatedOpportunity: 6000,
          confidence: 68,
          evidence: [
            `description length: ${page.metaDescription?.length ?? 0}`,
            page.url,
          ],
          fixPath: "Add a 140–160 character benefit-led meta description.",
          difficulty: "easy",
          estimatedTime: "20 min",
          verificationSteps: ["Meta description present in head", "Preview in SERP tool"],
          pageUrl: page.url,
        }),
      );
    }

    add(Boolean(page.canonical), 4);
    add(Boolean(page.og["og:title"] && page.og["og:description"]), 5);
    if (!page.og["og:title"] || !page.og["og:description"]) {
      findings.push(
        finding({
          category: "metadata",
          title: "Incomplete Open Graph tags",
          problem: "og:title and/or og:description missing.",
          businessImpact: "Social shares look sparse, reducing referral conversion.",
          whyItMatters: "OG tags control first impression on LinkedIn/X/Slack.",
          estimatedOpportunity: 4000,
          confidence: 65,
          evidence: [`og keys: ${Object.keys(page.og).join(", ") || "none"}`, page.url],
          fixPath: "Add og:title, og:description, og:image, og:url for this page.",
          difficulty: "easy",
          estimatedTime: "30 min",
          verificationSteps: ["Facebook/LinkedIn debugger shows correct preview"],
          pageUrl: page.url,
        }),
      );
    }

    add(Boolean(page.twitter["twitter:card"]), 3);
    add(page.h1.length === 1, 5);
    if (page.h1.length === 0) {
      findings.push(
        finding({
          category: "seo",
          title: "Missing H1 heading",
          problem: "No H1 found on the page.",
          businessImpact: "Weaker topical clarity for crawlers and AI systems.",
          whyItMatters: "H1 anchors on-page relevance for buyer-intent queries.",
          estimatedOpportunity: 3500,
          confidence: 70,
          evidence: [page.url],
          fixPath: "Add a single clear H1 matching the primary page intent.",
          difficulty: "easy",
          estimatedTime: "15 min",
          verificationSteps: ["Exactly one H1 in DOM"],
          pageUrl: page.url,
        }),
      );
    }

    add(page.jsonLdTypes.length > 0, 8);
    if (page.jsonLdTypes.length === 0) {
      findings.push(
        finding({
          category: "seo",
          title: "No JSON-LD structured data",
          problem: "No application/ld+json blocks detected.",
          businessImpact:
            "Missed rich results and weaker machine understanding of the product.",
          whyItMatters:
            "Organization / SoftwareApplication schema helps SEO and AI visibility.",
          estimatedOpportunity: 15000,
          confidence: 74,
          evidence: [page.url],
          fixPath:
            "Add Organization + SoftwareApplication (and FAQ where relevant) JSON-LD.",
          difficulty: "medium",
          estimatedTime: "2–4 hours",
          verificationSteps: [
            "Rich Results Test passes",
            "JSON-LD validates",
          ],
          pageUrl: page.url,
        }),
      );
    } else {
      add(
        page.jsonLdTypes.some((t) =>
          /Organization|SoftwareApplication|WebSite|Product/i.test(t),
        ),
        4,
      );
    }

    if (page.imageCount > 0) {
      add(page.imagesMissingAlt === 0, 4);
      if (page.imagesMissingAlt > 0) {
        findings.push(
          finding({
            category: "seo",
            title: "Images missing alt text",
            problem: `${page.imagesMissingAlt}/${page.imageCount} images lack alt text.`,
            businessImpact: "Accessibility and image search equity are left on the table.",
            whyItMatters: "Alt text supports accessibility compliance and SEO.",
            estimatedOpportunity: 2500,
            confidence: 78,
            evidence: [`${page.imagesMissingAlt} missing alt`, page.url],
            fixPath: "Add descriptive alt attributes to all meaningful images.",
            difficulty: "easy",
            estimatedTime: "1–2 hours",
            verificationSteps: ["No empty alts on content images"],
            pageUrl: page.url,
          }),
        );
      }
    }

    add(page.internalLinks >= 3, 3);
  }

  const score = max > 0 ? Math.round((points / max) * 100) : null;
  return { score, findings };
}
