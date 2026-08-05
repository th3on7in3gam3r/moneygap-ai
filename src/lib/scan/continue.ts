import { getSiteOrigin } from "@/lib/seo";

/** Schedule the next serverless crawl tick (self-invoke). */
export async function scheduleScanTick(analysisId: string): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  const origin =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    getSiteOrigin();

  if (!secret || !origin) {
    console.warn("scheduleScanTick: missing CRON_SECRET or APP_URL; tick not scheduled");
    return;
  }

  const url = `${origin}/api/scan/tick`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ analysisId }),
    });
  } catch (err) {
    console.error("scheduleScanTick failed", err);
  }
}
