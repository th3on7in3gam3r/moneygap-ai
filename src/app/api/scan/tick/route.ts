import { after } from "next/server";
import { z } from "zod";
import { processScanTick } from "@/lib/scan/batch";

export const maxDuration = 60;

const bodySchema = z.object({
  analysisId: z.string().uuid(),
});

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "analysisId required" }, { status: 400 });
  }

  const { analysisId } = parsed.data;

  // Process this batch in the current invocation; further ticks self-schedule.
  try {
    const result = await processScanTick(analysisId);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("scan tick error", err);
    // Retry once via after() for transient failures
    after(() => {
      void processScanTick(analysisId).catch((e) =>
        console.error("scan tick retry failed", e),
      );
    });
    return Response.json({ ok: false, error: "tick_failed" }, { status: 500 });
  }
}
