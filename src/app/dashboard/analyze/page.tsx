import type { Metadata } from "next";
import { AnalyzeUrlForm } from "@/components/analysis/analyze-url-form";

export const metadata: Metadata = {
  title: "Analyze Website",
};

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          New analysis
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Analyze New Website
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Paste a public URL. MoneyGap AI crawls key pages, scores MoneyGap
          Categories™, builds a Growth Opportunity Report with a prioritized Fix
          Roadmap, and generates implementation prompts. A full scan can take up
          to 10–15 minutes.
        </p>
      </div>
      <AnalyzeUrlForm initialUrl={params.url ?? ""} />
    </div>
  );
}
