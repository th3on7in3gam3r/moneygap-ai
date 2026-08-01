import type { PlaybookId } from "@/lib/advisor/playbooks";

const CHECKLISTS: Record<PlaybookId, string[]> = {
  newsletter: [
    "Choose email platform",
    "Create signup form",
    "Write lead magnet",
    "Design popup / embed",
    "Create welcome email",
    "Write first five newsletter drafts",
    "Connect automation",
    "Launch",
    "Measure opens, clicks, and conversions",
  ],
  faq: [
    "Collect top customer questions",
    "Draft 30 FAQs with answers",
    "Add FAQ schema markup",
    "Publish FAQ page",
    "Link FAQ from homepage and support",
    "Measure support deflection / SEO traffic",
  ],
  testimonials: [
    "Identify happy customers to ask",
    "Send testimonial request email",
    "Collect reviews / quotes",
    "Build testimonials section on site",
    "Add logos / outcomes where available",
    "Publish and promote social proof",
  ],
  backlinks: [
    "Define target sites and anchors",
    "Draft guest post ideas",
    "Build outreach email templates",
    "Send first outreach batch",
    "Follow up",
    "Track placements and referral traffic",
  ],
  lead_magnet: [
    "Pick magnet format",
    "Outline content",
    "Write / design magnet",
    "Create landing page",
    "Connect email capture",
    "Launch and promote",
    "Measure opt-in rate",
  ],
  digital_product: [
    "Validate top product idea",
    "Define positioning and pricing",
    "Draft sales page",
    "Build delivery / access",
    "Create launch plan",
    "Market and sell",
    "Collect feedback and iterate",
  ],
  generic: [
    "Clarify the desired business outcome",
    "Define the smallest shippable version",
    "Assign owner and deadline",
    "Implement Quick Win",
    "Implement Medium Effort step",
    "Ship and measure impact",
  ],
};

export function checklistForPlaybook(playbook: PlaybookId): string[] {
  return [...(CHECKLISTS[playbook] ?? CHECKLISTS.generic)];
}
