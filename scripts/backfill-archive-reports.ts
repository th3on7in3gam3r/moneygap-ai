/**
 * One-off: keep newest intelligence report per website as ready; archive older.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-archive-reports.ts
 */
import { backfillArchiveSupersededReports } from "../src/lib/analysis/reports";

async function main() {
  const result = await backfillArchiveSupersededReports();
  console.log(
    JSON.stringify(
      {
        ok: true,
        archived: result.archived,
        websitesTouched: result.websitesTouched,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
