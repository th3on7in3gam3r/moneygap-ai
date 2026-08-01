import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Liveness + DB ping — no secrets. */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      db: true,
      durationMs: Date.now() - started,
      ts: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        db: false,
        durationMs: Date.now() - started,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
