import { privacyFinding } from "./finding";
import { privacyStatus } from "./status";
import type {
  PrivacyContributors,
  PrivacyEvidence,
  PrivacyFinding,
  PrivacyResult,
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

export function scorePrivacy(evidence: PrivacyEvidence): PrivacyResult {
  const findings: PrivacyFinding[] = [];
  const consentUx = emptyBucket();
  const cookieSecurity = emptyBucket();
  const policyDocs = emptyBucket();
  const trackingHygiene = emptyBucket();
  const thirdParty = emptyBucket();
  const consentStorage = emptyBucket();
  const unavailableReasons: Record<string, string> = {};

  const home = evidence.homepage;
  const privacy = evidence.privacyPage;
  const cookiePg = evidence.cookiePage;

  if (!home) {
    unavailableReasons.homepage = "Homepage could not be fetched for privacy probes.";
  }

  // —— Policy docs ——
  const hasPrivacy =
    Boolean(privacy && privacy.status && privacy.status >= 200 && privacy.status < 400) ||
    Boolean(home?.hasPrivacyLink);
  add(policyDocs, hasPrivacy, 40);
  if (!hasPrivacy) {
    findings.push(
      privacyFinding({
        title: "Privacy policy not clearly published",
        problem: "No reachable /privacy page or prominent privacy link was verified.",
        whyItMatters:
          "Visitors and buyers need a clear explanation of what data is collected and why.",
        businessImpact:
          "Missing privacy documentation weakens Trust Engine™ signals and enterprise readiness.",
        estimatedOpportunity: 12000,
        confidence: 82,
        evidence: [
          `privacy page status: ${privacy?.status ?? "missing"}`,
          `homepage privacy link: ${home?.hasPrivacyLink ? "yes" : "no"}`,
        ],
        priority: "high",
        fixPath:
          "Publish a clear /privacy page and link it from the footer and consent experience.",
        difficulty: "easy",
        estimatedTime: "1–2 hours",
        verificationSteps: [
          "GET /privacy returns 200",
          "Footer links to Privacy",
          "Policy names processors honestly",
        ],
        contributor: "policyDocs",
        pageUrl: privacy?.url ?? null,
      }),
    );
  } else {
    add(policyDocs, true, 15);
  }

  const hasCookiePolicy =
    Boolean(cookiePg && cookiePg.status && cookiePg.status >= 200 && cookiePg.status < 400) ||
    Boolean(home?.hasCookiePolicyLink) ||
    hasPrivacy;
  add(policyDocs, hasCookiePolicy, 20);
  if (!hasCookiePolicy) {
    findings.push(
      privacyFinding({
        title: "Cookie / consent policy not discoverable",
        problem: "No cookie policy page or in-policy cookie section was verified.",
        whyItMatters: "Users should understand cookies and storage before optional tracking.",
        businessImpact: "Opaque cookie practices reduce trust and raise support friction.",
        estimatedOpportunity: 6000,
        confidence: 70,
        evidence: [`cookie page status: ${cookiePg?.status ?? "missing"}`],
        priority: "medium",
        fixPath:
          "Document cookies in Privacy Policy or a dedicated cookie preferences page.",
        difficulty: "easy",
        estimatedTime: "45–90 min",
        verificationSteps: [
          "Cookie purposes listed by category",
          "Link from Smart Consent™ or footer",
        ],
        contributor: "policyDocs",
      }),
    );
  }

  // —— Consent UX ——
  const cmpSignals = [
    ...(home?.cmpHeuristics ?? []),
    ...(privacy?.cmpHeuristics ?? []),
  ];
  const hasConsentUx = cmpSignals.length > 0;
  add(consentUx, hasConsentUx, 50);
  if (!hasConsentUx) {
    findings.push(
      privacyFinding({
        title: "No consent experience detected",
        problem:
          "Homepage HTML did not show a consent banner, preference center, or Smart Consent™ markers.",
        whyItMatters:
          "A trust-first consent experience explains categories and lets visitors choose optional data use.",
        businessImpact:
          "Without consent UX, optional tracking (if added later) would lack transparent control.",
        estimatedOpportunity: 10000,
        confidence: 68,
        evidence: ["CMP heuristics: none matched"],
        priority: "medium",
        fixPath:
          "Ship Smart Consent™ or an equivalent preference center with Accept All / Reject Optional / Customize.",
        difficulty: "medium",
        estimatedTime: "4–8 hours",
        verificationSteps: [
          "First visit shows consent choices",
          "Preferences can be updated anytime",
          "Essential category cannot be disabled",
        ],
        contributor: "consentUx",
      }),
    );
  } else {
    add(consentUx, true, 20);
  }

  const storageHints = [
    ...(home?.consentStorageHints ?? []),
    ...(privacy?.consentStorageHints ?? []),
  ];
  add(consentStorage, storageHints.length > 0 || hasConsentUx, 40);
  if (storageHints.length === 0 && !hasConsentUx) {
    findings.push(
      privacyFinding({
        title: "Consent storage not detected",
        problem: "No cookie or localStorage keys associated with consent preferences were observed.",
        whyItMatters: "Consent choices should persist and be auditable over time.",
        businessImpact: "Without stored consent, preferences reset and Trust Score™ evidence weakens.",
        estimatedOpportunity: 5000,
        confidence: 60,
        evidence: ["consent storage hints: none"],
        priority: "low",
        fixPath: "Persist consent categories with a versioned first-party cookie or account record.",
        difficulty: "medium",
        estimatedTime: "2–4 hours",
        verificationSteps: [
          "Consent cookie or DB record present after choice",
          "Version field matches current schema",
        ],
        contributor: "consentStorage",
      }),
    );
  }

  // —— Cookie security (from Set-Cookie samples) ——
  const allSet = [
    ...(home?.setCookies ?? []),
    ...(privacy?.setCookies ?? []),
    ...evidence.headerSamples.flatMap((h) => h.setCookies),
  ];
  if (allSet.length === 0) {
    unavailableReasons.setCookie =
      "No Set-Cookie headers observed on probed public pages (common for static marketing).";
    add(cookieSecurity, true, 10);
  } else {
    const insecure = allSet.filter((c) => !c.secure && evidence.origin.startsWith("https"));
    const noHttpOnly = allSet.filter(
      (c) => !c.httpOnly && !c.name.startsWith("__client") && c.name !== "theme",
    );
    const badSameSite = allSet.filter(
      (c) => c.sameSite && c.sameSite.toLowerCase() === "none" && !c.secure,
    );

    add(cookieSecurity, insecure.length === 0, 40);
    add(cookieSecurity, noHttpOnly.length === 0, 25);
    add(cookieSecurity, badSameSite.length === 0, 20);
    add(cookieSecurity, home?.https ?? false, 15);

    if (insecure.length > 0) {
      findings.push(
        privacyFinding({
          title: "Cookies missing Secure flag",
          problem: `${insecure.length} Set-Cookie value(s) lacked Secure on an HTTPS origin.`,
          whyItMatters: "Secure cookies are only sent over HTTPS, reducing interception risk.",
          businessImpact: "Session or preference cookies without Secure weaken security posture.",
          estimatedOpportunity: 8000,
          confidence: 88,
          evidence: insecure.slice(0, 4).map((c) => `${c.name}: Secure=false`),
          priority: "high",
          fixPath: "Set Secure on all cookies served from HTTPS.",
          difficulty: "easy",
          estimatedTime: "30–60 min",
          verificationSteps: ["Inspect Set-Cookie; Secure present", "Confirm HTTPS-only delivery"],
          contributor: "cookieSecurity",
        }),
      );
    }
    if (badSameSite.length > 0) {
      findings.push(
        privacyFinding({
          title: "SameSite=None without Secure",
          problem: "Cross-site cookies require Secure when SameSite=None.",
          whyItMatters: "Browsers reject or weaken improperly configured cross-site cookies.",
          businessImpact: "Broken sessions and weaker CSRF protections.",
          estimatedOpportunity: 7000,
          confidence: 90,
          evidence: badSameSite.slice(0, 3).map((c) => c.name),
          priority: "high",
          fixPath: "Pair SameSite=None with Secure, or prefer SameSite=Lax for first-party auth.",
          difficulty: "easy",
          estimatedTime: "30 min",
          verificationSteps: ["Set-Cookie includes SameSite and Secure correctly"],
          contributor: "cookieSecurity",
        }),
      );
    }
  }

  if (home && !home.https) {
    findings.push(
      privacyFinding({
        title: "Site not served over HTTPS",
        problem: "Homepage final URL was not HTTPS.",
        whyItMatters: "HTTPS protects credentials, sessions, and consent traffic in transit.",
        businessImpact: "Browsers warn users; enterprise buyers treat this as a trust failure.",
        estimatedOpportunity: 15000,
        confidence: 95,
        evidence: [`url: ${home.url}`],
        priority: "critical",
        fixPath: "Enable TLS and redirect all HTTP traffic to HTTPS.",
        difficulty: "medium",
        estimatedTime: "1–4 hours",
        verificationSteps: ["https:// loads", "http:// redirects to https://"],
        contributor: "cookieSecurity",
      }),
    );
    add(cookieSecurity, false, 30);
  } else if (home?.https) {
    add(cookieSecurity, true, 20);
  }

  // —— Tracking hygiene ——
  const trackHosts = [
    ...new Set([
      ...(home?.analyticsScriptHosts ?? []),
      ...(privacy?.analyticsScriptHosts ?? []),
    ]),
  ];
  const thirdHosts = [
    ...new Set([
      ...(home?.thirdPartyScriptHosts ?? []),
      ...(privacy?.thirdPartyScriptHosts ?? []),
    ]),
  ];

  add(trackingHygiene, trackHosts.length === 0, 50);
  if (trackHosts.length > 0 && !hasConsentUx) {
    findings.push(
      privacyFinding({
        title: "Analytics scripts without consent UX",
        problem: `Detected analytics-related script host(s): ${trackHosts.slice(0, 4).join(", ")}.`,
        whyItMatters:
          "Optional analytics should load only after clear consent when required by your policies.",
        businessImpact:
          "Loading analytics before choice creates Trust Score™ and Privacy Score™ risk.",
        estimatedOpportunity: 14000,
        confidence: 75,
        evidence: trackHosts.slice(0, 6),
        priority: "high",
        fixPath:
          "Gate analytics behind Smart Consent™ Analytics category (or remove unused scripts).",
        difficulty: "medium",
        estimatedTime: "2–6 hours",
        verificationSteps: [
          "Reject Optional → analytics scripts not loaded",
          "Accept Analytics → scripts may load",
        ],
        contributor: "trackingHygiene",
      }),
    );
  } else if (trackHosts.length === 0) {
    add(trackingHygiene, true, 20);
  }

  add(thirdParty, thirdHosts.length <= 3, 30);
  add(thirdParty, thirdHosts.length === 0, 20);
  if (thirdHosts.length > 6) {
    findings.push(
      privacyFinding({
        title: "High third-party script exposure",
        problem: `${thirdHosts.length} distinct third-party script hosts were detected.`,
        whyItMatters: "Each third party expands the data-sharing surface visitors cannot see.",
        businessImpact: "More processors means more trust explanation and higher privacy risk.",
        estimatedOpportunity: 9000,
        confidence: 72,
        evidence: thirdHosts.slice(0, 8),
        priority: "medium",
        fixPath: "Audit third-party scripts; keep only those with a clear product purpose.",
        difficulty: "medium",
        estimatedTime: "2–5 hours",
        verificationSteps: [
          "List each host and purpose in Privacy Center™",
          "Remove unused tags",
        ],
        contributor: "thirdPartyExposure",
      }),
    );
  }

  const contributors: PrivacyContributors = {
    consentUx: ratio(consentUx),
    cookieSecurity: ratio(cookieSecurity),
    policyDocs: ratio(policyDocs),
    trackingHygiene: ratio(trackingHygiene),
    thirdPartyExposure: ratio(thirdParty),
    consentStorage: ratio(consentStorage),
  };

  const parts = Object.values(contributors).filter((n): n is number => n != null);
  const score =
    parts.length === 0 ? null : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  const status = privacyStatus(score);

  const complianceChecklist: PrivacyResult["complianceChecklist"] = [
    {
      item: "Privacy policy published",
      status: hasPrivacy ? "pass" : "fail",
      note: hasPrivacy ? "Verified page or link" : "Not verified",
    },
    {
      item: "HTTPS",
      status: home?.https ? "pass" : home ? "fail" : "unknown",
      note: home ? (home.https ? "HTTPS verified" : "Not HTTPS") : "Homepage unavailable",
    },
    {
      item: "Consent experience",
      status: hasConsentUx ? "pass" : "fail",
      note: hasConsentUx ? "Heuristics matched" : "Not detected on probed pages",
    },
    {
      item: "Analytics gated by consent",
      status: trackHosts.length === 0 ? "pass" : hasConsentUx ? "unknown" : "fail",
      note:
        trackHosts.length === 0
          ? "No analytics hosts detected"
          : hasConsentUx
            ? "Analytics present — verify load order with counsel"
            : "Analytics without consent UX",
    },
    {
      item: "Counsel review of policies",
      status: "unknown",
      note: "Organizations should review policies with legal counsel before production claims.",
    },
  ];

  const trackingDetected = [...trackHosts, ...thirdHosts.filter((h) => !trackHosts.includes(h))];

  const executiveSummary =
    score == null
      ? "Privacy Score™ could not be fully computed from available probes."
      : `Privacy Score™ is ${score}/100 (${status}). ${
          findings.length === 0
            ? "Verified probes did not surface high-priority privacy gaps."
            : `${findings.length} issue(s) were identified from verified page and header evidence.`
        } Optional analytics are ${trackHosts.length === 0 ? "not currently detected" : "present — review consent gating"}.`;

  const estimatedImprovement =
    findings.length === 0
      ? "Maintain published policies, HTTPS, and a clear consent preference center."
      : "Prioritize policy pages, Secure cookie flags, and consent UX before adding optional trackers.";

  return {
    score,
    status,
    contributors,
    findings,
    unavailableReasons,
    executiveSummary,
    estimatedImprovement,
    trackingDetected,
    complianceChecklist,
    evidence,
  };
}
