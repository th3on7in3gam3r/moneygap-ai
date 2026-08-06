import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { websites } from "@/db/schema";
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
    const sites = await db
      .select({
        id: websites.id,
        name: websites.name,
        domain: websites.domain,
        url: websites.url,
      })
      .from(websites)
      .where(eq(websites.workspaceId, ctx.workspace.id))
      .orderBy(asc(websites.name));
    return Response.json({ ...data, websites: sites });
  } catch {
    return Response.json({ error: "Could not load integrations" }, { status: 500 });
  }
}
