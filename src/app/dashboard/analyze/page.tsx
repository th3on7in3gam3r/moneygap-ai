import type { Metadata } from "next";
import { AnalyzeUrlForm } from "@/components/analysis/analyze-url-form";

export const metadata: Metadata = {
  title: "Analyze Website",
};

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; auto?: string }>;
}) {
  const params = await searchParams;
  const initialUrl = params.url ?? "";
  // Prefill handoffs (extension /open-engine) auto-launch unless ?auto=0.
  const autoStart = Boolean(initialUrl.trim()) && params.auto !== "0";

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          New analysis
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {autoStart ? "Starting your Engine scan" : "Analyze New Website"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {autoStart
            ? "We prefilled your site from the extension handoff and are launching the full MoneyGap Engine™ crawl automatically."
            : "Paste a public URL. MoneyGap AI crawls key pages, scores MoneyGap Categories™, builds a Growth Opportunity Report with a prioritized Fix Roadmap, and generates implementation prompts. A full scan can take up to 10–15 minutes."}
        </p>
      </div>
      <AnalyzeUrlForm initialUrl={initialUrl} autoStart={autoStart} />
    </div>
  );
}
