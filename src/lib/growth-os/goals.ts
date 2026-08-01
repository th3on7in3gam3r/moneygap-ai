import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  businessGoals,
  goalLinks,
  type BusinessGoal,
  type BusinessGoalType,
} from "@/db/schema";

export async function listGoals(workspaceId: string, status?: string) {
  if (status) {
    return db.query.businessGoals.findMany({
      where: and(
        eq(businessGoals.workspaceId, workspaceId),
        eq(businessGoals.status, status),
      ),
      orderBy: [desc(businessGoals.priority), desc(businessGoals.createdAt)],
    });
  }
  return db.query.businessGoals.findMany({
    where: eq(businessGoals.workspaceId, workspaceId),
    orderBy: [desc(businessGoals.priority), desc(businessGoals.createdAt)],
  });
}

export async function listActiveGoals(workspaceId: string) {
  return listGoals(workspaceId, "active");
}

export async function createGoal(input: {
  workspaceId: string;
  title: string;
  type: BusinessGoalType;
  targetValue?: string | null;
  priority?: number;
}) {
  const [row] = await db
    .insert(businessGoals)
    .values({
      workspaceId: input.workspaceId,
      title: input.title,
      type: input.type,
      targetValue: input.targetValue ?? null,
      priority: input.priority ?? 50,
      status: "active",
    })
    .returning();
  return row;
}

export async function updateGoal(
  id: string,
  workspaceId: string,
  patch: Partial<{
    title: string;
    type: string;
    targetValue: string | null;
    status: string;
    priority: number;
  }>,
) {
  const [row] = await db
    .update(businessGoals)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(businessGoals.id, id), eq(businessGoals.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteGoal(id: string, workspaceId: string) {
  await db
    .delete(businessGoals)
    .where(and(eq(businessGoals.id, id), eq(businessGoals.workspaceId, workspaceId)));
}

export async function linkGoal(input: {
  goalId: string;
  opportunityId?: string | null;
  projectId?: string | null;
}) {
  const [row] = await db
    .insert(goalLinks)
    .values({
      goalId: input.goalId,
      opportunityId: input.opportunityId ?? null,
      projectId: input.projectId ?? null,
    })
    .returning();
  return row;
}

export function activeGoalTypes(goals: BusinessGoal[]): BusinessGoalType[] {
  return goals
    .filter((g) => g.status === "active")
    .map((g) => g.type as BusinessGoalType);
}
