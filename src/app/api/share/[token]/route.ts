import { resolveShareToken } from "@/lib/agency/share";

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const resolved = await resolveShareToken(token);
  if (!resolved) {
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });
  }
  if (!resolved.link.permissions.view) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json({
    permissions: resolved.link.permissions,
    client: {
      name: resolved.client.name,
      industry: resolved.client.industry,
    },
    brand: resolved.brand
      ? {
          logoUrl: resolved.brand.logoUrl,
          companyName: resolved.brand.companyName,
          primaryColor: resolved.brand.primaryColor,
          accentColor: resolved.brand.accentColor,
          contactInfo: resolved.brand.contactInfo,
          reportFooter: resolved.brand.reportFooter,
          showPoweredBy: resolved.brand.showPoweredBy,
        }
      : null,
    report: resolved.report,
    opportunities: resolved.opportunities,
    comments: resolved.comments,
    approvals: resolved.approvals,
  });
}
