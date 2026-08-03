import { auth } from "@clerk/nextjs/server";
import { listPublicDocs } from "@/lib/docs";
import { isPlatform10Enabled } from "@/lib/launch";

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
  const docs = listPublicDocs(category).map((d) => ({
    slug: d.slug,
    title: d.title,
    summary: d.summary,
    category: d.category,
    href: `/docs/${d.slug}`,
  }));

  return Response.json({
    enabled: true,
    docs,
  });
}
