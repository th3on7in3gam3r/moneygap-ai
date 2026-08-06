import type { DiscoveryResult, OnProgress } from "moneygap-crawler";
import { discoverOnly } from "moneygap-crawler";
import { getScanProfile } from "./profiles";
import type { ScanProfile } from "./types";

export async function runScanDiscovery(input: {
  url: string;
  profile: ScanProfile;
  onProgress?: OnProgress;
}): Promise<DiscoveryResult> {
  const cfg = getScanProfile(input.profile);
  return discoverOnly(
    {
      url: input.url,
      mode: cfg.crawlerMode,
      maxPages: cfg.maxPages,
      maxDepth: cfg.maxDepth,
      concurrency: cfg.concurrency,
      maxRuntimeMs: 45_000,
      playwrightEnabled: false,
    },
    { onProgress: input.onProgress },
  );
}
