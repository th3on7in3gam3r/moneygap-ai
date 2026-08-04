import { afterEach, describe, expect, it } from "vitest";
import { shouldSkipEmailPrompt } from "../src/utils/prompt.js";

describe("shouldSkipEmailPrompt", () => {
  const prevCi = process.env.CI;
  const prevNoPrompt = process.env.MONEYGAP_NO_PROMPT;

  afterEach(() => {
    if (prevCi === undefined) delete process.env.CI;
    else process.env.CI = prevCi;
    if (prevNoPrompt === undefined) delete process.env.MONEYGAP_NO_PROMPT;
    else process.env.MONEYGAP_NO_PROMPT = prevNoPrompt;
  });

  it("skips when --yes is present", () => {
    delete process.env.CI;
    delete process.env.MONEYGAP_NO_PROMPT;
    expect(shouldSkipEmailPrompt(["node", "cli", "https://x.com", "--yes"])).toBe(
      true,
    );
  });

  it("skips when --no-prompt is present", () => {
    delete process.env.CI;
    delete process.env.MONEYGAP_NO_PROMPT;
    expect(
      shouldSkipEmailPrompt(["node", "cli", "https://x.com", "--no-prompt"]),
    ).toBe(true);
  });

  it("skips when CI=1", () => {
    process.env.CI = "1";
    delete process.env.MONEYGAP_NO_PROMPT;
    expect(shouldSkipEmailPrompt(["node", "cli", "https://x.com"])).toBe(true);
  });
});
