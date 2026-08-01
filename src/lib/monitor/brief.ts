import OpenAI from "openai";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  analysisComparisons,
  growthBriefs,
  type GrowthBriefPayload,
} from "@/db/schema";

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

export async function shouldGenerateBrief(websiteId: string, workspaceId: string) {
  const latest = await db.query.growthBriefs.findFirst({
    where: and(
      eq(growthBriefs.workspaceId, workspaceId),
      eq(growthBriefs.websiteId, websiteId),
    ),
    orderBy: [desc(growthBriefs.createdAt)],
  });
  if (!latest) return true;
  const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
  return Date.now() - latest.createdAt.getTime() > sixDaysMs;
}

export async function buildGrowthBrief(input: {
  workspaceId: string;
  websiteId: string;
  websiteName: string;
  comparisonId?: string | null;
}): Promise<typeof growthBriefs.$inferSelect | null> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const comparisons = await db.query.analysisComparisons.findMany({
    where: and(
      eq(analysisComparisons.websiteId, input.websiteId),
      gte(analysisComparisons.createdAt, periodStart),
    ),
    orderBy: [desc(analysisComparisons.createdAt)],
    limit: 5,
  });

  const latest = comparisons[0];
  const changes = latest?.changes;
  const payload: GrowthBriefPayload = {
    whatChanged: changes?.reasons ?? ["No re-analysis in this period yet."],
    newOps: (changes?.newOpportunities ?? []).map((o) => o.title),
    completed: (changes?.resolved ?? []).map((o) => o.title),
    priorities: (changes?.newOpportunities ?? [])
      .slice()
      .sort((a, b) => b.opportunityIndex - a.opportunityIndex)
      .slice(0, 5)
      .map((o) => o.title),
    competitorUpdates: changes?.competitorNotes ?? [],
    nextSteps: [
      "Review the highest Opportunity Index™ gaps",
      "Open Action Center™ on the top priority",
      "Track progress on the Action tab",
    ],
  };

  let body = [
    `Weekly Growth Brief for ${input.websiteName}`,
    "",
    "What changed:",
    ...payload.whatChanged.map((l) => `• ${l}`),
    "",
    "New opportunities:",
    ...(payload.newOps.length
      ? payload.newOps.map((l) => `• ${l}`)
      : ["• None this period"]),
    "",
    "Completed / no longer detected:",
    ...(payload.completed.length
      ? payload.completed.map((l) => `• ${l}`)
      : ["• None this period"]),
    "",
    "Priorities:",
    ...payload.priorities.map((l) => `• ${l}`),
    "",
    "Next steps:",
    ...payload.nextSteps.map((l) => `• ${l}`),
  ].join("\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && latest) {
    try {
      const client = new OpenAI({ apiKey });
      const model = process.env.OPENAI_MODEL || "gpt-4o";
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content:
              "You are the MoneyGap AI Growth Advisor. Write a concise Weekly Growth Brief (3–5 short paragraphs) for a founder. No guarantees. Reference concrete changes. End with 2–3 next steps.",
          },
          {
            role: "user",
            content: JSON.stringify({
              website: input.websiteName,
              summary: latest.summary,
              changes: latest.changes,
              scoreDelta: latest.scoreDelta,
            }),
          },
        ],
      });
      const text = extractOutputText(response);
      if (text) body = text;
    } catch (err) {
      console.error("buildGrowthBrief OpenAI:", err);
    }
  }

  const [row] = await db
    .insert(growthBriefs)
    .values({
      workspaceId: input.workspaceId,
      websiteId: input.websiteId,
      periodStart,
      periodEnd,
      title: `Weekly Growth Brief · ${input.websiteName}`,
      body,
      payload,
    })
    .returning();

  return row;
}
