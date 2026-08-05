import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { estimateScan } from "@/lib/scan/estimator";
import { SCAN_PROFILES } from "@/lib/scan/profiles";

export const maxDuration = 30;

const bodySchema = z.object({
  url: z.string().min(1),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a website URL." }, { status: 400 });
  }

  try {
    const result = await estimateScan(parsed.data.url);
    if (!result.ok) {
      return Response.json(
        {
          error: result.error,
          code: result.code,
          diagnostics: result.diagnostics,
        },
        { status: 400 },
      );
    }
    return Response.json({
      estimate: result.estimate,
      diagnostics: result.diagnostics,
      profiles: Object.values(SCAN_PROFILES).map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        maxPages: p.maxPages,
      })),
    });
  } catch (err) {
    console.error("scan estimate error", err);
    return Response.json(
      { error: "Could not estimate this website. Try again." },
      { status: 500 },
    );
  }
}
