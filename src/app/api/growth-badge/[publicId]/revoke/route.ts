import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { revokeBadge } from "@/lib/growth-badge";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ publicId: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicId } = await ctx.params;
  if (!publicId?.trim()) {
    return Response.json({ error: "publicId required" }, { status: 400 });
  }

  try {
    const agency = await loadAgencyContext();
    const result = await revokeBadge({
      workspaceId: agency.workspace.id,
      publicId: publicId.trim(),
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json({ badge: result.badge });
  } catch {
    return Response.json({ error: "Could not revoke badge" }, { status: 500 });
  }
}
