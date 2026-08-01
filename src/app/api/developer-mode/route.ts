import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getDeveloperModeOverview } from "@/lib/developer";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const data = await getDeveloperModeOverview(ctx.workspace.id);
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Could not load Developer Mode" },
      { status: 500 },
    );
  }
}
