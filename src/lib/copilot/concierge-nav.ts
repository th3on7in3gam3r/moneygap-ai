/**
 * Smart navigation intents for AI Growth Concierge™.
 * Returns confirm-only hrefs — never auto-navigates.
 */

export type ConciergeNavMatch = {
  id: string;
  label: string;
  href: string;
  reason: string;
};

const ROUTES: {
  id: string;
  label: string;
  href: string;
  patterns: RegExp[];
}[] = [
  {
    id: "reports",
    label: "Open Reports",
    href: "/dashboard/reports",
    patterns: [/open (my )?reports?/, /show (my )?reports?/, /go to reports?/],
  },
  {
    id: "money_gaps",
    label: "Review Opportunities",
    href: "/dashboard/money-gaps",
    patterns: [
      /money gaps?/,
      /opportunit/,
      /review (my )?gaps?/,
      /show (my )?gaps?/,
    ],
  },
  {
    id: "integrations",
    label: "Show Integrations",
    href: "/dashboard/integrations",
    patterns: [/integrations?/, /connect (tools?|hub)/, /integration hub/],
  },
  {
    id: "automation",
    label: "Open Automation",
    href: "/dashboard/automation",
    patterns: [/automation/, /workflows?/],
  },
  {
    id: "backlinks",
    label: "Take me to Backlinks",
    href: "/dashboard/money-gaps",
    patterns: [/backlinks?/, /authority|guest post|outreach/],
  },
  {
    id: "ide_prompt",
    label: "Open IDE Prompt",
    href: "/dashboard/ide-prompt",
    patterns: [/ide prompt/, /code \+ ai/, /developer mode/],
  },
  {
    id: "academy",
    label: "Open Growth Academy™",
    href: "/dashboard/academy",
    patterns: [/growth academy/, /\bacademy\b/, /playbooks?/, /close (the )?gaps?/],
  },
  {
    id: "academy_cms",
    label: "Open Academy CMS",
    href: "/dashboard/academy/cms",
    patterns: [/academy cms/, /publishing engine/, /blog cms/, /content editor/],
  },
  {
    id: "scan",
    label: "Start a Scan",
    href: "/dashboard/analyze",
    patterns: [/start (a )?scan/, /run (an? )?analysis/, /analyze (my )?(site|website)/],
  },
  {
    id: "websites",
    label: "Open Websites",
    href: "/dashboard/websites",
    patterns: [/websites?/, /my sites?/],
  },
  {
    id: "privacy_center",
    label: "Open Privacy Center™",
    href: "/dashboard/settings/privacy",
    patterns: [
      /privacy center/,
      /cookie (prefs|preferences|inventory)/,
      /consent history/,
      /smart consent/,
      /what cookies/,
      /delete my (data|account)/,
      /privacy score/,
    ],
  },
  {
    id: "privacy_report",
    label: "Open Privacy Report",
    href: "/dashboard/self-optimization/privacy",
    patterns: [/privacy report/, /privacy intelligence/],
  },
  {
    id: "settings",
    label: "Open Settings",
    href: "/dashboard/settings",
    patterns: [/settings/, /billing|plan/],
  },
  {
    id: "concierge",
    label: "Growth Concierge™",
    href: "/dashboard/copilot",
    patterns: [/concierge/, /ask moneygap/, /growth copilot/],
  },
];

/** Match natural-language navigation from a user message. */
export function resolveConciergeNav(message: string): ConciergeNavMatch | null {
  const hay = message.trim().toLowerCase();
  if (!hay) return null;

  // Prefer explicit “take me / open / show / go to” phrasing
  const wantsNav =
    /^(take me|open|show|go to|navigate|bring me|start)/i.test(hay) ||
    /\b(take me to|open my|show my|go to)\b/i.test(hay);

  for (const route of ROUTES) {
    if (!route.patterns.some((p) => p.test(hay))) continue;
    if (!wantsNav && !/take me|open|show|go to|start/i.test(hay)) {
      // Still allow strong destination-only phrases for common destinations
      if (!/reports?|integrations?|money gaps?|scan|academy|backlinks?|privacy|cookie|consent/i.test(hay)) {
        continue;
      }
    }
    return {
      id: route.id,
      label: route.label,
      href: route.href,
      reason: `Smart navigation → ${route.label}`,
    };
  }
  return null;
}
