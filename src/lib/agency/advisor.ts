import OpenAI from "openai";
import { getAgencyOverview } from "@/lib/agency/overview";
import { listClients } from "@/lib/agency/clients";

function extractOutputText(response: OpenAI.Responses.Response): string {
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text") chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

export async function askAgencyAdvisor(input: {
  workspaceId: string;
  agencyName: string;
  message: string;
}) {
  const overview = await getAgencyOverview(input.workspaceId);
  const clients = await listClients(input.workspaceId);
  const context = {
    agency: input.agencyName,
    overview,
    clients: clients.slice(0, 40).map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      status: c.status,
      websiteUrl: c.websiteUrl,
      assignedUserId: c.assignedUserId,
      sites: c.websites?.map((w) => ({ domain: w.domain, name: w.name })),
    })),
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      reply:
        "Agency Advisor needs OPENAI_API_KEY. Based on portfolio data alone: focus clients with MoneyGap Score™ ≥ 60 and open high Opportunity Index gaps first.",
    };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: `You are the MoneyGap Agency AI Advisor™ for ${input.agencyName}. Help agencies prioritize clients, summarize wins, and spot portfolio patterns. Never invent client facts not in context. No financial guarantees. Be concise and actionable.`,
      },
      {
        role: "user",
        content: JSON.stringify({ question: input.message, portfolio: context }),
      },
    ],
  });

  const reply =
    extractOutputText(response) ||
    "I could not generate a response. Try asking which clients need attention.";
  return { reply };
}
