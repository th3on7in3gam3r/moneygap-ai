import OpenAI from "openai";
import {
  formatContextForPrompt,
  loadAdvisorContext,
} from "@/lib/advisor/context";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

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
  throw new Error("Advisor reply failed. Please try again.");
}

export async function runAdvisorChat(input: {
  reportId: string;
  userMessage: string;
  opportunityId?: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const ctx = await loadAdvisorContext(input.reportId);
  if (!ctx) throw new Error("Report not found.");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const historyText = (input.history ?? [])
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const response = await client.responses.create({
    model,
    instructions: `You are the AI Growth Advisor™ for MoneyGap AI — a business strategist, marketer, copywriter, and product advisor in one.

Rules:
- Always ground answers in the provided report context (business, audience, Money Gaps, competitors, projects).
- Connect advice to Visibility → Traffic → Leads → Customers → Revenue.
- Prefer concrete next steps, copy drafts, and checklists the founder can use immediately.
- Never auto-publish; frame outputs as drafts for review.
- If the user completed gaps, suggest smart follow-ups among remaining open gaps.
- Be concise, professional, and actionable — not generic.`,
    input: `REPORT CONTEXT:
${formatContextForPrompt(ctx, input.opportunityId)}

${historyText ? `RECENT CHAT:\n${historyText}\n\n` : ""}USER: ${input.userMessage}`,
  });

  return extractOutputText(response);
}

export async function suggestNextAfterComplete(input: {
  reportId: string;
  completedTitle: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "Great progress. Review remaining Money Gaps and tackle the highest Opportunity Index™ next.";

  const ctx = await loadAdvisorContext(input.reportId);
  if (!ctx) return "Great progress. Keep closing the highest-impact gaps.";

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    const response = await client.responses.create({
      model,
      instructions:
        "You are MoneyGap AI Growth Advisor. In 2–4 short sentences, congratulate closing a gap and recommend the single best next action from remaining open gaps. Reference report context. Drafts only — no publish claims.",
      input: `User just completed: ${input.completedTitle}

Context:
${formatContextForPrompt(ctx)}`,
    });
    return extractOutputText(response);
  } catch {
    const next = ctx.openGaps[0];
    if (!next) return "Outstanding — major gaps are closed. Re-run analysis later to find new opportunities.";
    return `Nice work finishing “${input.completedTitle}”. Next, prioritize “${next.title}” (Opportunity Index™ ${next.opportunityIndex}).`;
  }
}
