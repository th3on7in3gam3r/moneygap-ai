import { auth, currentUser } from "@clerk/nextjs/server";
import {
  acceptInvite,
  getInviteByToken,
  requireTeamFeature,
} from "@/lib/team";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({ error: feature.error }, { status: feature.status });
  }

  const { token } = await ctx.params;
  const invite = await getInviteByToken(token);
  if (!invite) {
    return Response.json({ error: "Invalid invite" }, { status: 404 });
  }

  return Response.json({
    invite: {
      email: invite.email,
      role: invite.role,
      clientName: invite.client?.name ?? null,
      workspaceName:
        invite.workspace?.agencyName || invite.workspace?.name || "Workspace",
      expiresAt: invite.expiresAt.toISOString(),
      accepted: !!invite.acceptedAt,
      revoked: !!invite.revokedAt,
      expired: invite.expiresAt.getTime() < Date.now(),
    },
  });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({ error: feature.error }, { status: feature.status });
  }

  const { isAuthenticated, userId: _clerkId } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return Response.json({ error: "No email on account" }, { status: 400 });
  }

  // Ensure app user row exists
  const { userId } = await ensureUserAndWorkspace();

  const { token } = await ctx.params;
  const result = await acceptInvite({
    token,
    userId,
    userEmail: email,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    ok: true,
    alreadyMember: result.alreadyMember,
    workspaceId: result.workspaceId,
    redirect:
      result.member && "clientId" in result.member && result.member.clientId
        ? "/dashboard/my-growth"
        : "/dashboard/team",
  });
}
