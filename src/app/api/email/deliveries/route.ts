import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { listRecentDeliveries } from "@/lib/email/analytics/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await ensureUserAndWorkspace();
    const deliveries = await listRecentDeliveries(userId, 25);
    return Response.json({ ok: true, deliveries });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
