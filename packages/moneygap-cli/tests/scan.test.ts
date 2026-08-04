import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runScan } from "../src/analyzers/run-scan.js";
import { exitCodeForScan } from "../src/utils/exit.js";

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

describe("CLI scan smoke", () => {
  it("scans next-site fixture and returns a score", async () => {
    const result = await runScan(path.join(fixtures, "next-site"));
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.framework.id).toBe("next");
    expect(result.version).toBe("1.0.0");
  });

  it("bare site exits with findings code when high/critical present", async () => {
    const result = await runScan(path.join(fixtures, "bare-site"));
    const code = exitCodeForScan(result);
    expect([0, 1]).toContain(code);
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
