import OpenAI from "openai";
import type { AssetSection } from "@/db/schema";
import {
  playbookTitle,
  type PlaybookId,
} from "@/lib/advisor/playbooks";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

const sectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "heading", "body"],
  properties: {
    id: { type: "string" },
    heading: { type: "string" },
    body: { type: "string" },
  },
} as const;

const assetSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections"],
  properties: {
    title: { type: "string" },
    sections: { type: "array", items: sectionSchema },
  },
} as const;

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) {
          return part.text;
        }
      }
    }
  }
  throw new Error("Asset generation failed. Please try again.");
}

const PLAYBOOK_INSTRUCTIONS: Record<PlaybookId, string> = {
  newsletter: `Generate a Newsletter Implementation Pack with sections covering:
newsletter strategy, lead magnet ideas, landing page copy, signup form copy, popup copy,
welcome sequence (3–5 emails), first five newsletter drafts, email automation plan, and implementation checklist.
Mark drafts clearly as implementation-ready for human review — not auto-published.`,
  faq: `Generate an FAQ Pack: ~30 FAQs with answers tailored to the business, SEO FAQ schema suggestions,
and a ready-to-publish FAQ page draft (markdown). Human review required before publish.`,
  testimonials: `Generate a Testimonials Pack: customer request email, review request, landing page section copy,
and example testimonial placements. Do not invent fake customer names as real quotes — label examples as samples.`,
  backlinks: `Generate a Backlink Campaign Pack: strategy, guest posting ideas, resource page ideas, partnership ideas,
outreach email templates, follow-up emails, anchor text suggestions, campaign checklist.
Focus on business outcomes (traffic → leads → revenue), not vanity metrics.`,
  lead_magnet: `Generate a Lead Magnet Builder Pack covering ideas for eBook, checklist, template, guide, prompt pack,
worksheet, mini course, and email course — pick the best 2–3 for this business and draft outlines + opt-in copy.`,
  digital_product: `Generate a Digital Product Builder Pack: 10 product ideas, positioning, pricing guidance (AI Estimate),
sales page draft, launch plan, and marketing strategy. Frame estimates as directional.`,
  seo_content: `Generate a Buyer-Intent Content Pack for thin topical / SEO content gaps. Include sections for:
1) Buyer-intent keyword shortlist (8–12 keywords) with funnel stage (awareness / consideration / decision),
2) 90-day content calendar (weekly topics only — draft editorial plan, not published),
3) One full markdown article draft for the top buyer-intent keyword,
4) Internal-linking plan to home, pricing, and related conversion pages,
5) FAQ / comparison page outline for high-intent queries,
6) Implementation checklist (research → drafts → human review → publish outside MoneyGap),
7) Impact note labeled "AI Estimate" with no guarantees on traffic, leads, or revenue.
Never claim content is live or auto-published. All copy is for human review before publish.`,
  site_chatbot: `Generate a Site Chatbot Pack for missing AI assistant / FAQ + lead qualification chat. Include sections for:
1) FAQ / objection answer bank tailored to the business (draft replies only),
2) Lead-qualify question flow with routing rules (trial / demo / sales handoff / self-serve),
3) Sample conversation transcripts (visitor → bot → CTA) — labeled as drafts for human review,
4) Tool shortlist notes (Intercom, Drift, or similar) as configuration guidance — not SDK embeds or live widgets,
5) Implementation checklist (research → draft flows → human review → enable outside MoneyGap),
6) Impact note labeled "AI Estimate" with no guarantees on leads, conversions, or revenue.
Never claim a chatbot is live or auto-connected to CRM/email. All copy and flows are for human review before enablement.`,
  generic: `Generate a practical Implementation Pack for this Money Gap: strategy overview, copy drafts,
step-by-step plan, and checklist. Connect every step to Visibility → Traffic → Leads → Customers → Revenue.`,
};

export async function generateAssetPack(input: {
  playbook: PlaybookId;
  opportunity: {
    title: string;
    whatsMissing: string;
    whyItMatters: string;
    businessImpact: string;
    moduleId?: string | null;
  };
  contextJson: string;
}): Promise<{ title: string; sections: AssetSection[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const response = await client.responses.create({
    model,
    instructions: `You are the Build This For Me engine for MoneyGap AI.
Philosophy: Discover → Explain → Build → Implement → Grow.
Never claim content is published. Produce editable drafts for the founder to review.
${PLAYBOOK_INSTRUCTIONS[input.playbook]}
Return JSON with title and sections (id, heading, body). Body may use markdown.`,
    input: `Playbook: ${input.playbook} (${playbookTitle(input.playbook)})

Opportunity:
${JSON.stringify(input.opportunity)}

Report context:
${input.contextJson.slice(0, 50000)}`,
    text: {
      format: {
        type: "json_schema",
        name: "generated_asset_pack",
        strict: true,
        schema: assetSchema,
      },
    },
  });

  const text = extractOutputText(response);
  const parsed = JSON.parse(text) as { title: string; sections: AssetSection[] };
  return {
    title: parsed.title || playbookTitle(input.playbook),
    sections: (parsed.sections ?? []).map((s, i) => ({
      id: s.id || `section-${i + 1}`,
      heading: s.heading || `Section ${i + 1}`,
      body: s.body || "",
    })),
  };
}
