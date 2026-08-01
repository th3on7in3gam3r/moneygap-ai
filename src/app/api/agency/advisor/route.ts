import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { askAgencyAdvisor } from "@/lib/agency/advisor";
import { requireAgencyPermission } from "@/lib/agency/workspace";

const schema = z.object({
  message: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  if (!gate.ctx.isAgency) {
    return Response.json(
      { error: "Agency Advisor is available for agency workspaces." },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const result = await askAgencyAdvisor({
    workspaceId: gate.ctx.workspace.id,
    agencyName:
      gate.ctx.workspace.agencyName ?? gate.ctx.workspace.name ?? "Agency",
    message: parsed.data.message,
  });
  return Response.json(result);
}
