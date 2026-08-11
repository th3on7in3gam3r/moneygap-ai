/**
 * Scan Engine V3 worker — durable stage loop.
 * Runs on Render (or locally) with full monorepo access to analysis runners.
 *
 *   SCAN_ENGINE_V3=1 DATABASE_URL=... npx tsx scripts/scan-engine-worker.ts
 */
import { createRequire } from "node:module";
import {
  processOneScanStage,
  sleep,
  isScanEngineV3Enabled,
} from "moneygap-scan-engine";
import { buildDefaultStageRunners } from "../src/lib/scan-engine/runners";

const require = createRequire(import.meta.url);

async function main() {
  if (!isScanEngineV3Enabled()) {
    console.log("scan-engine-worker: SCAN_ENGINE_V3 disabled — idle exit");
    // Keep process alive so Render doesn't crash-loop when flag off; poll flag.
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("scan-engine-worker: DATABASE_URL missing");
    process.exit(1);
  }

  const { default: pg } = require("pg") as {
    default: { Client: new (opts: { connectionString: string }) => {
      connect: () => Promise<void>;
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
      end: () => Promise<void>;
    } };
  };

  const workerId =
    process.env.RENDER_INSTANCE_ID ||
    process.env.HOSTNAME ||
    `scan-worker-${process.pid}`;
  const pollMs = Number(process.env.SCAN_WORKER_POLL_MS || 3000);
  const runners = buildDefaultStageRunners();

  console.log("scan-engine-worker: starting", { workerId, pollMs });

  for (;;) {
    if (!isScanEngineV3Enabled()) {
      await sleep(10_000);
      continue;
    }

    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      let processed = true;
      while (processed) {
        const result = await processOneScanStage(client, runners, {
          workerId,
        });
        processed = result.processed;
        if (processed) {
          console.log("scan-engine-worker: processed stage", result.stage);
        }
      }
    } catch (err) {
      console.error("scan-engine-worker: loop error", err);
    } finally {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
    await sleep(pollMs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
