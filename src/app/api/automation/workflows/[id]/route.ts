import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getWorkflowDetail } from "@/lib/automation";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    const detail = await getWorkflowDetail(ctx.workspace.id, id);
    if (!detail) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(detail);
  } catch {
    return Response.json({ error: "Could not load workflow" }, { status: 500 });
  }
}
