import { auth } from "@clerk/nextjs/server";
import { isPlatform10Enabled, listDocCatalog } from "@/lib/launch";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatform10Enabled()) {
    return Response.json({
      enabled: false,
      message: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0).",
      docs: [],
    });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  return Response.json({
    enabled: true,
    docs: listDocCatalog(category),
  });
}
