import { AnalysisProgress } from "@/components/analysis/analysis-progress";

export default async function AnalysisProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalysisProgress analysisId={id} />;
}
