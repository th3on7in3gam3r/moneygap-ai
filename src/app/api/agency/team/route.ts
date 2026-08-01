import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, workspaceMembers } from "@/db/schema";
import { writeAuditLog } from "@/lib/agency/audit";
import { getPlanLimits } from "@/lib/agency/plans";
import { requireAgencyPermission } from "@/lib/agency/workspace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, gate.ctx.workspace.id),
    with: { user: true },
  });
  return Response.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      userId: m.userId,
      user: m.user
        ? {
            id: m.user.id,
            email: m.user.email,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
          }
        : null,
      createdAt: m.createdAt.toISOString(),
    })),
    planLimits: getPlanLimits(gate.ctx.workspace.plan),
  });
}

const postSchema = z.object({
  email: z.string().email(),
  role: z
    .enum([
      "admin",
      "executive",
      "marketing",
      "developer",
      "analyst",
      "client_manager",
      "viewer",
    ])
    .default("analyst"),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageTeam");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { requireFeature, upgradeResponse } = await import("@/lib/billing");
  const featureGate = await requireFeature(
    gate.ctx.workspace.id,
    "team_members",
  );
  if (!featureGate.ok) return upgradeResponse(featureGate);

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const limits = getPlanLimits(gate.ctx.workspace.plan);
  const existingMembers = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, gate.ctx.workspace.id),
  });
  if (existingMembers.length >= limits.maxSeats) {
    return Response.json(
      {
        error: `Plan seat limit: ${limits.maxSeats}`,
        code: "usage_limit",
        suggestedPlan: "agency",
      },
      { status: 403 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email.toLowerCase()),
  });
  if (!user) {
    return Response.json(
      {
        error:
          "User must already have a MoneyGap account. Full Clerk invites ship with Stripe billing.",
      },
      { status: 404 },
    );
  }

  const already = existingMembers.find((m) => m.userId === user.id);
  if (already) {
    return Response.json({ error: "Already a member" }, { status: 400 });
  }

  const [member] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId: gate.ctx.workspace.id,
      userId: user.id,
      role: parsed.data.role,
    })
    .returning();

  await writeAuditLog({
    workspaceId: gate.ctx.workspace.id,
    actorUserId: gate.ctx.userId,
    action: "team.add",
    entityType: "workspace_member",
    entityId: member.id,
  });

  return Response.json({ member });
}
