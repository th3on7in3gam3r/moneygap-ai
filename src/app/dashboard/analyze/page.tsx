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
          Paste a public URL. MoneyGap AI will crawl key pages, understand the business, and build a
          Website Intelligence Report.
        </p>
      </div>
      <AnalyzeUrlForm initialUrl={params.url ?? ""} />
    </div>
  );
}
