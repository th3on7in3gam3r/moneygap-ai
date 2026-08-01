import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  isGrowthCopilotEnabled,
  listMemoryEntries,
  upsertMemoryEntry,
} from "@/lib/copilot";
import type { BusinessMemoryKind } from "@/db/schema";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ enabled: false, entries: [], message: "Disabled" });
  }
  try {
    const ctx = await loadAgencyContext();
    const entries = await listMemoryEntries(ctx.workspace.id);
    return Response.json({ enabled: true, entries });
  } catch {
    return Response.json({ error: "Could not load memory" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ error: "Growth Copilot disabled" }, { status: 403 });
  }

  try {
    const ctx = await loadAgencyContext();
    const body = (await req.json()) as {
      kind?: BusinessMemoryKind;
      key?: string;
      value?: Record<string, unknown> | string;
      source?: string;
      confidence?: number | null;
    };

    const kind = body.kind ?? "fact";
    const key = body.key?.trim();
    if (!key) {
      return Response.json({ error: "key required" }, { status: 400 });
    }

    const value =
      typeof body.value === "string"
        ? { text: body.value }
        : body.value && typeof body.value === "object"
          ? body.value
          : { text: "" };

    const entry = await upsertMemoryEntry({
      workspaceId: ctx.workspace.id,
      kind,
      key,
      value,
      source: body.source ?? "user",
      confidence: body.confidence ?? null,
    });

    return Response.json({ entry });
  } catch {
    return Response.json({ error: "Could not save memory" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ error: "Growth Copilot disabled" }, { status: 403 });
  }

  try {
    const ctx = await loadAgencyContext();
    const body = (await req.json()) as {
      id?: string;
      kind?: BusinessMemoryKind;
      key?: string;
      value?: Record<string, unknown> | string;
      source?: string;
      confidence?: number | null;
    };

    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const value =
      typeof body.value === "string"
        ? { text: body.value }
        : body.value ?? { text: "" };

    const entry = await upsertMemoryEntry({
      workspaceId: ctx.workspace.id,
      id: body.id,
      kind: body.kind ?? "fact",
      key: body.key?.trim() || "updated",
      value,
      source: body.source ?? "user",
      confidence: body.confidence ?? null,
    });

    if (!entry) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ entry });
  } catch {
    return Response.json({ error: "Could not update memory" }, { status: 500 });
  }
}
