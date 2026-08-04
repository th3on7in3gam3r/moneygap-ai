import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectFramework } from "../src/frameworks/detect.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("detectFramework", () => {
  it("detects Next.js from package.json", async () => {
    const fw = await detectFramework(path.join(root, "next-site"));
    expect(fw.id).toBe("next");
    expect(fw.name).toBe("Next.js");
    expect(fw.version).toBe("15.0.0");
  });

  it("returns unknown for bare package", async () => {
    const fw = await detectFramework(path.join(root, "bare-site"));
    expect(fw.id).toBe("unknown");
  });
});
