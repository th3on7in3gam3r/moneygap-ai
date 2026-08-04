import { runDueClientReports } from "@/lib/agency/client-reports";
import { authorizeCron } from "@/lib/cron/auth";

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  try {
    const result = await runDueClientReports({ dryRun });
    return Response.json({ ok: true, dryRun, ...result });
  } catch (err) {
    console.error("cron/agency-reports:", err);
    return Response.json({ error: "Cron failed" }, { status: 500 });
  }
}
