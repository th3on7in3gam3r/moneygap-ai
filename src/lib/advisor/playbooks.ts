export type PlaybookId =
  | "newsletter"
  | "faq"
  | "testimonials"
  | "backlinks"
  | "lead_magnet"
  | "digital_product"
  | "seo_content"
  | "generic";

export type ActionButtonId =
  | "build"
  | "learn_why"
  | "save"
  | "complete"
  | "create_project"
  | "checklist"
  | "ask_advisor"
  | "outreach"
  | "testimonial_request"
  | "campaign";

const PLAYBOOK_BUTTONS: Record<PlaybookId, ActionButtonId[]> = {
  newsletter: [
    "build",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
  faq: ["build", "learn_why", "save", "complete", "create_project", "checklist", "ask_advisor"],
  testimonials: [
    "build",
    "testimonial_request",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
  backlinks: [
    "campaign",
    "outreach",
    "build",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
  lead_magnet: [
    "build",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
  digital_product: [
    "build",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
  seo_content: [
    "build",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
  generic: [
    "build",
    "learn_why",
    "save",
    "complete",
    "create_project",
    "checklist",
    "ask_advisor",
  ],
};

export const BUTTON_LABELS: Record<ActionButtonId, string> = {
  build: "Build This For Me",
  learn_why: "Learn Why",
  save: "Save for Later",
  complete: "Mark Complete",
  create_project: "Create Project",
  checklist: "Generate Checklist",
  ask_advisor: "Ask Advisor",
  outreach: "Generate Outreach Emails",
  testimonial_request: "Generate Testimonial Request",
  campaign: "Launch Backlink Campaign",
};

export function resolvePlaybook(input: {
  moduleId?: string | null;
  title: string;
  category?: string | null;
  whatsMissing?: string | null;
}): PlaybookId {
  const hay = `${input.moduleId ?? ""} ${input.category ?? ""} ${input.title} ${input.whatsMissing ?? ""}`.toLowerCase();

  if (/newsletter|email list|welcome sequence|drip/.test(hay)) return "newsletter";
  if (/\bfaq\b|frequently asked/.test(hay)) return "faq";
  if (/testimonial|review|social proof|case stud/.test(hay)) return "testimonials";
  if (/backlink|guest post|outreach|authority|digital pr|mention/.test(hay))
    return "backlinks";
  if (/lead magnet|download|checklist|ebook|e-book|worksheet|prompt pack/.test(hay))
    return "lead_magnet";
  if (
    /digital product|course|template pack|membership|subscription product|licensing/.test(
      hay,
    ) ||
    input.moduleId === "revenue"
  ) {
    if (/newsletter/.test(hay)) return "newsletter";
    if (/digital product|course|template|membership/.test(hay)) return "digital_product";
  }
  if (input.moduleId === "authority") return "backlinks";
  if (input.moduleId === "trust") return "testimonials";
  if (input.moduleId === "content" && /faq/.test(hay)) return "faq";
  if (input.moduleId === "marketing" && /lead|magnet|download/.test(hay))
    return "lead_magnet";
  if (
    /buyer.?intent|thin topical|pillar|content calendar|long.?tail|comparison page|\bgeo\b|ai citation/.test(
      hay,
    ) ||
    input.moduleId === "seo" ||
    input.moduleId === "content"
  ) {
    return "seo_content";
  }

  return "generic";
}

export function buttonsForPlaybook(playbook: PlaybookId): ActionButtonId[] {
  return PLAYBOOK_BUTTONS[playbook] ?? PLAYBOOK_BUTTONS.generic;
}

export function playbookTitle(playbook: PlaybookId): string {
  const map: Record<PlaybookId, string> = {
    newsletter: "Newsletter Implementation Pack",
    faq: "FAQ Page Pack",
    testimonials: "Testimonials & Social Proof Pack",
    backlinks: "Backlink Campaign Pack",
    lead_magnet: "Lead Magnet Builder Pack",
    digital_product: "Digital Product Builder Pack",
    seo_content: "Buyer-Intent Content Pack",
    generic: "Implementation Pack",
  };
  return map[playbook];
}
