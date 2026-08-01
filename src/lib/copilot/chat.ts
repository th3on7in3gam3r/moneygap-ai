import OpenAI from "openai";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  copilotMessages,
  copilotThreads,
  type CopilotMessageMeta,
  type CopilotMode,
} from "@/db/schema";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";
import {
  formatCopilotContextForPrompt,
  loadCopilotContext,
} from "@/lib/copilot/context";
import { systemPromptForMode } from "@/lib/copilot/modes";
import { hintFixPathForText } from "@/lib/copilot/fix-path-hints";

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
  throw new Error("Copilot reply failed. Please try again.");
}

function buildMeta(
  reply: string,
  ctx: Awaited<ReturnType<typeof loadCopilotContext>>,
): CopilotMessageMeta {
  const ctxGaps = ctx.openGaps;
  const top = ctxGaps[0];
  const hint = hintFixPathForText({
    title: top?.title,
    category: top?.category,
    moduleId: top?.moduleId,
    whatsMissing: top?.whatsMissing,
    difficulty: top?.difficulty,
  });

  const evidence = [
    ...ctxGaps.slice(0, 3).map((g) =>
      g.websiteDomain
        ? `Opportunity: ${g.title} · ${g.websiteDomain}`
        : `Opportunity: ${g.title}`,
    ),
  ];
  if (!evidence.length) evidence.push("Workspace context (soft / general)");

  const needsApproval =
    /hub|integrat|automat|zapier|publish|pull request|pr\b|crm|email send/i.test(
      reply,
    );

  return {
    evidence,
    confidence: top ? Math.min(92, 55 + Math.round((top.opportunityIndex ?? 40) / 3)) : 50,
    fixPathId: hint.recommendedId,
    requiresApproval: needsApproval || true,
    citations: [hint.reason],
    websiteId: ctx.focusWebsite?.id ?? top?.websiteId ?? null,
    websiteName: ctx.focusWebsite?.name ?? top?.websiteName ?? null,
    websiteDomain: ctx.focusWebsite?.domain ?? top?.websiteDomain ?? null,
  };
}

export async function createCopilotThread(input: {
  workspaceId: string;
  userId: string;
  mode?: CopilotMode;
  title?: string;
  clientId?: string | null;
}) {
  const [row] = await db
    .insert(copilotThreads)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      mode: input.mode ?? "ceo",
      title: input.title?.trim() || "Ask MoneyGap",
      clientId: input.clientId ?? null,
    })
    .returning();
  return row!;
}

export async function listCopilotThreads(workspaceId: string, limit = 20) {
  try {
    return await db.query.copilotThreads.findMany({
      where: eq(copilotThreads.workspaceId, workspaceId),
      orderBy: [desc(copilotThreads.updatedAt)],
      limit,
    });
  } catch {
    return [];
  }
}

export async function getThreadMessages(threadId: string) {
  return db.query.copilotMessages.findMany({
    where: eq(copilotMessages.threadId, threadId),
    orderBy: [asc(copilotMessages.createdAt)],
    limit: 100,
  });
}

export async function runCopilotChat(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
  message: string;
  isAgency?: boolean;
  websiteId?: string | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const thread = await db.query.copilotThreads.findFirst({
    where: eq(copilotThreads.id, input.threadId),
  });
  if (!thread || thread.workspaceId !== input.workspaceId) {
    throw new Error("Thread not found.");
  }

  await db.insert(copilotMessages).values({
    threadId: thread.id,
    role: "user",
    content: input.message,
  });

  const ctx = await loadCopilotContext({
    workspaceId: input.workspaceId,
    isAgency: input.isAgency,
    websiteId: input.websiteId,
  });

  const prior = await getThreadMessages(thread.id);
  const historyText = prior
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(0, -1)
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  let reply: string;
  try {
    const response = await client.responses.create({
      model,
      instructions: systemPromptForMode(thread.mode),
      input: `WORKSPACE CONTEXT:
${formatCopilotContextForPrompt(ctx)}

${historyText ? `RECENT CHAT:\n${historyText}\n\n` : ""}USER: ${input.message}`,
    });
    reply = extractOutputText(response);
  } catch {
    const top = ctx.openGaps[0];
    const site = top?.websiteDomain ? ` (${top.websiteDomain})` : "";
    reply = top
      ? `Based on your open gaps, prioritize “${top.title}”${site} next (Opportunity Index™ ${top.opportunityIndex ?? "—"}). This is an AI Estimate of impact — review before acting. Use Fix Path Chooser™ to pick how to execute. Drafts only — never auto-publish.`
      : `I can help once you run an analysis or add Business Memory facts. Start with goals and your top Money Gaps. Drafts only — never auto-publish.`;
  }

  const meta = buildMeta(reply, ctx);

  const [assistant] = await db
    .insert(copilotMessages)
    .values({
      threadId: thread.id,
      role: "assistant",
      content: reply,
      meta,
    })
    .returning();

  await db
    .update(copilotThreads)
    .set({ updatedAt: new Date() })
    .where(eq(copilotThreads.id, thread.id));

  return { message: assistant!, meta, thread };
}
