import { isScanEngineV3Enabled } from "moneygap-scan-engine";

export function isScanEngineV3(): boolean {
  return isScanEngineV3Enabled(process.env);
}

export { isScanEngineV3Enabled };
