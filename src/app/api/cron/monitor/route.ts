import { runDueMonitors } from "@/lib/monitor/run-due";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-secret") === secret) return true;
  return false;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const result = await runDueMonitors({ dryRun });
    return Response.json({
      ok: true,
      dryRun,
      dueCount: result.dueCount,
      started: result.started,
      briefs: result.briefs,
    });
  } catch (err) {
    console.error("cron/monitor:", err);
    return Response.json(
      { error: "Monitor cron failed", detail: String(err) },
      { status: 500 },
    );
  }
}
