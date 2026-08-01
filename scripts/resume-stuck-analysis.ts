/**
 * One-off: resume a website analysis stuck after the intelligence report was saved.
 * Usage: npx tsx --env-file=.env.local scripts/resume-stuck-analysis.ts <analysisId>
 */
import { resumeStuckAnalysis } from "../src/lib/analysis/pipeline";

async function main() {
  const analysisId = process.argv[2];
  if (!analysisId) {
    console.error("Usage: tsx scripts/resume-stuck-analysis.ts <analysisId>");
    process.exit(1);
  }
  console.log("Resuming", analysisId);
  const result = await resumeStuckAnalysis(analysisId);
  console.log(result);
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
