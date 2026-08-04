import { authorizeCron } from "@/lib/cron/auth";
import { runDailySelfScan } from "@/lib/self-optimization";

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const result = await runDailySelfScan({ dryRun });
    return Response.json({ dryRun, ...result });
  } catch (err) {
    console.error("cron/self-optimization:", err);
    return Response.json(
      { error: "Self Optimization cron failed", detail: String(err) },
      { status: 500 },
    );
  }
}
