import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  invalidatePulseCollectKeyCache,
  isPulseCollectKey,
  PULSE_PROVIDER_SLUG,
  PULSE_SITE_ID,
  resolvePulseCollectKey,
} from "@/lib/analytics/pulse";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { beginConnect, disconnectIntegration, getProviderCredentials } from "@/lib/integrations";

const bodySchema = z.object({
  collectKey: z.string().min(8).max(200),
});

function maskKey(key: string): string {
  if (key.length <= 12) return `${key.slice(0, 4)}…`;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const connected = await getProviderCredentials(
      ctx.workspace.id,
      PULSE_PROVIDER_SLUG,
    );
    const envKey =
      process.env.NEXT_PUBLIC_PULSE_DATA_KEY?.trim() ||
      process.env.PULSE_DATA_KEY?.trim() ||
      "";
    const activeKey = await resolvePulseCollectKey();

    return Response.json({
      site: process.env.NEXT_PUBLIC_PULSE_SITE?.trim() || PULSE_SITE_ID,
      connected: Boolean(connected),
      collectKeyMasked: connected?.credentials.apiKey
        ? maskKey(connected.credentials.apiKey)
        : envKey
          ? maskKey(envKey)
          : null,
      sitePixelReady: Boolean(activeKey),
      source: envKey
        ? "env"
        : connected
          ? "settings"
          : null,
    });
  } catch {
    return Response.json({ error: "Could not load Pulse settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const isOwner = ctx.workspace.ownerId === ctx.userId;
    if (!isOwner && ctx.role !== "owner" && ctx.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const collectKey = parsed.data.collectKey.trim();
    if (collectKey.startsWith("psk_")) {
      return Response.json(
        {
          error:
            "That looks like a Dashboard Read Key (psk_…). Paste the Collect key (pck_…) from the Pulse install snippet instead.",
        },
        { status: 400 },
      );
    }
    if (!isPulseCollectKey(collectKey)) {
      return Response.json(
        {
          error:
            "Collect key must look like pck_… from the Cadence Pulse install snippet.",
        },
        { status: 400 },
      );
    }

    const result = await beginConnect({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      providerSlug: PULSE_PROVIDER_SLUG,
      apiKey: collectKey,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    invalidatePulseCollectKeyCache();

    return Response.json({
      ok: true,
      collectKeyMasked: maskKey(collectKey),
      sitePixelReady: true,
      source: "settings",
      message:
        "Cadence Pulse Collect key saved. The public site pixel will use it on the next page load.",
    });
  } catch {
    return Response.json({ error: "Could not save Pulse key" }, { status: 500 });
  }
}

export async function DELETE() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const isOwner = ctx.workspace.ownerId === ctx.userId;
    if (!isOwner && ctx.role !== "owner" && ctx.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await disconnectIntegration({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      providerSlug: PULSE_PROVIDER_SLUG,
    });
    invalidatePulseCollectKeyCache();

    const envStillSet = Boolean(
      process.env.NEXT_PUBLIC_PULSE_DATA_KEY?.trim() ||
        process.env.PULSE_DATA_KEY?.trim(),
    );

    return Response.json({
      ok: true,
      sitePixelReady: envStillSet,
      message: envStillSet
        ? "Disconnected from Settings. Site pixel still uses the host env Collect key."
        : "Cadence Pulse Collect key removed.",
    });
  } catch {
    return Response.json({ error: "Could not disconnect Pulse" }, { status: 500 });
  }
}
