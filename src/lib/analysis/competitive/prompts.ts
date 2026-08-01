import { COMPETITIVE_ENGINE_ERROR } from "@/lib/analysis/stages";

export const COMPETITIVE_STRATEGIST_RULES = `You are Competitive Intelligence™ for MoneyGap AI — an AI Business Growth Intelligence Platform.

CRITICAL RULES:
- This is strategic business comparison, NOT a competitor list and NOT an SEO auditor.
- Explain WHY competitors succeed and HOW the user can improve.
- Focus on missing opportunities vs peers; connect every gap to Visibility → Traffic → Leads → Customers → Revenue.
- Estimates are AI Estimates only — never claim certainty or guaranteed ROI.
- Prefer business language over jargon.
- Call out where the USER is stronger — do not only list weaknesses.
- Prefer high-value insights over laundry lists.`;

export function extractOutputText(response: {
  output_text?: string;
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
  }>;
}): string {
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
  throw new Error(COMPETITIVE_ENGINE_ERROR);
}
