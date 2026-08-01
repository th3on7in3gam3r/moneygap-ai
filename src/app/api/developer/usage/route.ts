import { auth } from "@clerk/nextjs/server";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { getDeveloperUsageSummary } from "@/lib/platform/usage";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewBilling");
  if (!gate.ok) {
    // owners/admins have viewBilling; fall through with manageWorkspace
    const manage = await requireAgencyPermission("manageWorkspace");
    if (!manage.ok) {
      return Response.json({ error: gate.error }, { status: gate.status });
    }
    const summary = await getDeveloperUsageSummary(manage.ctx.workspace.id);
    return Response.json(summary);
  }
  const summary = await getDeveloperUsageSummary(gate.ctx.workspace.id);
  return Response.json(summary);
}
