import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getBrandSettings, upsertBrandSettings } from "@/lib/agency/brand";
import { requireAgencyPermission } from "@/lib/agency/workspace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const brand = await getBrandSettings(gate.ctx.workspace.id);
  return Response.json({ brand: brand ?? null });
}

const putSchema = z.object({
  logoUrl: z.string().max(1000).nullable().optional(),
  companyName: z.string().max(200).nullable().optional(),
  primaryColor: z.string().max(40).nullable().optional(),
  accentColor: z.string().max(40).nullable().optional(),
  contactInfo: z.string().max(1000).nullable().optional(),
  reportFooter: z.string().max(2000).nullable().optional(),
  showPoweredBy: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageBrand");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  // Brand identity (name/logo/footer) is available on all plans.
  // Hiding "Powered by MoneyGap AI" requires white-label.
  const { requireFeature } = await import("@/lib/billing");
  let showPoweredBy = parsed.data.showPoweredBy;
  let whiteLabelNotice: string | undefined;
  if (showPoweredBy === false) {
    const featureGate = await requireFeature(
      gate.ctx.workspace.id,
      "white_label_reports",
    );
    if (!featureGate.ok) {
      // Soft-enforce: still save other fields; keep attribution on.
      showPoweredBy = true;
      whiteLabelNotice =
        featureGate.message ??
        "Upgrade to Agency to hide “Powered by MoneyGap AI”.";
    }
  }

  const emptyToNull = (v: string | null | undefined) =>
    v === undefined ? undefined : v?.trim() ? v.trim() : null;

  const brand = await upsertBrandSettings({
    workspaceId: gate.ctx.workspace.id,
    actorUserId: gate.ctx.userId,
    logoUrl: emptyToNull(parsed.data.logoUrl),
    companyName: emptyToNull(parsed.data.companyName),
    primaryColor: emptyToNull(parsed.data.primaryColor),
    accentColor: emptyToNull(parsed.data.accentColor),
    contactInfo: emptyToNull(parsed.data.contactInfo),
    reportFooter: emptyToNull(parsed.data.reportFooter),
    showPoweredBy,
  });

  if (whiteLabelNotice) {
    return Response.json({
      brand,
      warning: whiteLabelNotice,
      code: "upgrade_required" as const,
      feature: "white_label_reports" as const,
      suggestedPlan: "agency",
    });
  }

  return Response.json({ brand });
}
