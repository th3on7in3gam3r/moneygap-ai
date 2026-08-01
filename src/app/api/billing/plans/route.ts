import {
  ensureBillingPlansSeeded,
  listBillingPlans,
  PLAN_CATALOG,
} from "@/lib/billing";

export async function GET() {
  try {
    await ensureBillingPlansSeeded();
    const rows = await listBillingPlans();
    const plans = (rows.length ? rows : PLAN_CATALOG).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      monthlyPriceCents: p.monthlyPriceCents,
      annualPriceCents: p.annualPriceCents,
      sortOrder: "sortOrder" in p ? p.sortOrder : 0,
      limits: p.limits,
      features: p.features,
    }));
    plans.sort(
      (a, b) =>
        (typeof a.sortOrder === "number" ? a.sortOrder : 0) -
        (typeof b.sortOrder === "number" ? b.sortOrder : 0),
    );
    return Response.json({ plans });
  } catch (err) {
    console.error("billing plans:", err);
    return Response.json(
      {
        plans: PLAN_CATALOG.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          monthlyPriceCents: p.monthlyPriceCents,
          annualPriceCents: p.annualPriceCents,
          sortOrder: p.sortOrder,
          limits: p.limits,
          features: p.features,
        })),
      },
    );
  }
}
