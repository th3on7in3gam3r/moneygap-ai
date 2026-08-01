import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisorMessages, moneyGapOpportunities } from "@/db/schema";
import { suggestNextAfterComplete } from "@/lib/advisor/advisor";
import { assertReportAccess } from "@/lib/advisor/context";

const ALLOWED = new Set(["open", "saved", "in_progress", "completed"]);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ reportId: string; id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId, id } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as { implementationStatus?: string };
  const status = body.implementationStatus;
  if (!status || !ALLOWED.has(status)) {
    return Response.json({ error: "Invalid implementationStatus" }, { status: 400 });
  }

  const opportunity = await db.query.moneyGapOpportunities.findFirst({
    where: and(
      eq(moneyGapOpportunities.id, id),
      eq(moneyGapOpportunities.reportId, reportId),
    ),
  });
  if (!opportunity) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const workflowStatus =
    status === "completed"
      ? "resolved"
      : status === "in_progress"
        ? "in_progress"
        : status === "saved"
          ? "open"
          : "open";

  const [updated] = await db
    .update(moneyGapOpportunities)
    .set({
      implementationStatus: status,
      lifecycleStatus:
        status === "completed"
          ? "completed"
          : status === "in_progress"
            ? "in_progress"
            : status === "saved"
              ? "reviewed"
              : "detected",
      status: workflowStatus,
      completedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(moneyGapOpportunities.id, id))
    .returning();

  let followUp: string | null = null;
  if (status === "completed") {
    followUp = await suggestNextAfterComplete({
      reportId,
      completedTitle: opportunity.title,
    });
    await db.insert(advisorMessages).values({
      reportId,
      userId,
      role: "assistant",
      content: followUp,
      opportunityId: id,
    });
  }

  return Response.json({ opportunity: updated, followUp });
}
