import { auth } from "@clerk/nextjs/server";
import { listAgencyTemplates } from "@/lib/agency/templates";
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
  const templates = await listAgencyTemplates();
  return Response.json({ templates });
}
