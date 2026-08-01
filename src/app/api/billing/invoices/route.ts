import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { billingInvoices } from "@/db/schema";
import { requireAgencyPermission } from "@/lib/agency/workspace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireAgencyPermission("viewBilling");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const invoices = await db.query.billingInvoices.findMany({
    where: eq(billingInvoices.workspaceId, gate.ctx.workspace.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 50,
  });

  return Response.json({
    invoices: invoices.map((inv) => ({
      id: inv.id,
      amountCents: inv.amountCents,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hostedInvoiceUrl,
      periodStart: inv.periodStart?.toISOString() ?? null,
      periodEnd: inv.periodEnd?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    })),
    note: "Stripe invoices appear after Checkout is configured and active.",
  });
}
