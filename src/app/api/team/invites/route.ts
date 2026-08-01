import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  createInvite,
  listInvites,
  requireTeamCapability,
  revokeInvite,
} from "@/lib/team";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireTeamCapability("manageInvites");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const invites = await listInvites(gate.ctx!.workspace.id);
  return Response.json({
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      clientId: i.clientId,
      clientName: i.client?.name ?? null,
      expiresAt: i.expiresAt.toISOString(),
      acceptedAt: i.acceptedAt?.toISOString() ?? null,
      revokedAt: i.revokedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      invitePath: i.acceptedAt || i.revokedAt ? null : `/invite/${i.token}`,
    })),
  });
}

const postSchema = z.object({
  email: z.string().email(),
  role: z.string(),
  clientId: z.string().uuid().optional().nullable(),
  ttlDays: z.number().int().min(1).max(90).optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireTeamCapability("manageInvites");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await createInvite({
    ctx: gate.ctx!,
    email: parsed.data.email,
    role: parsed.data.role,
    clientId: parsed.data.clientId,
    ttlDays: parsed.data.ttlDays,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error, code: "code" in result ? result.code : undefined },
      { status: result.status },
    );
  }

  return Response.json({
    invite: {
      id: result.invite.id,
      email: result.invite.email,
      role: result.invite.role,
      clientId: result.invite.clientId,
      expiresAt: result.invite.expiresAt.toISOString(),
      invitePath: result.invitePath,
    },
  });
}

const deleteSchema = z.object({
  inviteId: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireTeamCapability("manageInvites");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await revokeInvite({
    ctx: gate.ctx!,
    inviteId: parsed.data.inviteId,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ invite: result.invite });
}
