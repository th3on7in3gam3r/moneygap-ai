import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import { writeAuditLog } from "@/lib/agency/audit";
import { requireAgencyPermission } from "@/lib/agency/workspace";

const schema = z.object({
  role: z.enum(["admin", "analyst", "client_manager", "viewer", "owner"]),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageTeam");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const { memberId } = await context.params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const [member] = await db
    .update(workspaceMembers)
    .set({ role: parsed.data.role })
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, gate.ctx.workspace.id),
      ),
    )
    .returning();

  if (!member) return Response.json({ error: "Not found" }, { status: 404 });

  await writeAuditLog({
    workspaceId: gate.ctx.workspace.id,
    actorUserId: gate.ctx.userId,
    action: "team.role",
    entityType: "workspace_member",
    entityId: member.id,
    meta: { role: parsed.data.role },
  });

  return Response.json({ member });
}
