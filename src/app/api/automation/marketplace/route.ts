import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listMarketplaceTemplates } from "@/lib/automation";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await loadAgencyContext();
    const templates = await listMarketplaceTemplates();
    return Response.json({ templates });
  } catch {
    return Response.json({ error: "Could not load marketplace" }, { status: 500 });
  }
}
