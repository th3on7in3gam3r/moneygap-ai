import { redirect } from "next/navigation";

/**
 * Sample report detail routes are retired. Real intelligence reports live at /reports/[id].
 */
export default async function LegacySampleReportRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/reports/${id}`);
}
