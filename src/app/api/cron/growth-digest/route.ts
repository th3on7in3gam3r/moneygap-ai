import { runGrowthDigestJob } from "@/lib/email/scheduler/run";
import { authorizeCron } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limit = Number(url.searchParams.get("limit") ?? "100") || 100;

  try {
    const result = await runGrowthDigestJob({ dryRun, limit });
    return Response.json({ ok: true, dryRun, ...result });
  } catch (err) {
    console.error("cron/growth-digest:", err);
    return Response.json(
      { error: "Growth digest cron failed", detail: String(err) },
      { status: 500 },
    );
  }
}
