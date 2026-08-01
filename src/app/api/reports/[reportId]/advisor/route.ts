import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisorMessages } from "@/db/schema";
import { runAdvisorChat } from "@/lib/advisor/advisor";
import { assertReportAccess } from "@/lib/advisor/context";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

export async function GET(
  _req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const messages = await db.query.advisorMessages.findMany({
    where: eq(advisorMessages.reportId, reportId),
    orderBy: [asc(advisorMessages.createdAt)],
    limit: 100,
  });

  return Response.json({ messages });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const { requireFeatureAndUsage, upgradeResponse, recordUsage } = await import(
    "@/lib/billing"
  );
  const gate = await requireFeatureAndUsage({
    workspaceId: access.report.workspaceId,
    feature: "ai_advisor",
    usageType: "ai_generation",
  });
  if (!gate.ok) return upgradeResponse(gate);

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: MISSING_KEYS_ERROR }, { status: 400 });
  }

  const body = (await req.json()) as {
    message?: string;
    opportunityId?: string | null;
  };

  const message = body.message?.trim();
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  await db.insert(advisorMessages).values({
    reportId,
    userId,
    role: "user",
    content: message,
    opportunityId: body.opportunityId ?? null,
  });

  const prior = await db.query.advisorMessages.findMany({
    where: eq(advisorMessages.reportId, reportId),
    orderBy: [asc(advisorMessages.createdAt)],
    limit: 40,
  });

  const history = prior
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(0, -1)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  try {
    const reply = await runAdvisorChat({
      reportId,
      userMessage: message,
      opportunityId: body.opportunityId,
      history,
    });

    const [assistant] = await db
      .insert(advisorMessages)
      .values({
        reportId,
        userId,
        role: "assistant",
        content: reply,
        opportunityId: body.opportunityId ?? null,
      })
      .returning();

    await recordUsage({
      workspaceId: access.report.workspaceId,
      type: "ai_generation",
      meta: { reportId, kind: "advisor" },
    });

    return Response.json({ message: assistant });
  } catch (err) {
    console.error("advisor chat:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Advisor failed" },
      { status: 500 },
    );
  }
}
