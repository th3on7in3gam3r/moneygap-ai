import { auth } from "@clerk/nextjs/server";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { getEnterpriseOverview } from "@/lib/platform/usage";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewBilling");
  if (!gate.ok) {
    const manage = await requireAgencyPermission("manageWorkspace");
    if (!manage.ok) {
      return Response.json({ error: gate.error }, { status: gate.status });
    }
    const overview = await getEnterpriseOverview(manage.ctx.workspace.id);
    return Response.json(overview);
  }
  const overview = await getEnterpriseOverview(gate.ctx.workspace.id);
  return Response.json(overview);
}
