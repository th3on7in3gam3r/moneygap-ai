import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listIntegrationsOverview } from "@/lib/integrations";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const data = await listIntegrationsOverview(ctx.workspace.id);
    return Response.json(data);
  } catch {
    return Response.json({ error: "Could not load integrations" }, { status: 500 });
  }
}
