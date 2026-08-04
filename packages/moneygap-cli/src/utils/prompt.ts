import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function shouldSkipEmailPrompt(argv = process.argv): boolean {
  if (process.env.CI === "true" || process.env.CI === "1") return true;
  if (process.env.MONEYGAP_NO_PROMPT === "1" || process.env.MONEYGAP_NO_PROMPT === "true") {
    return true;
  }
  if (argv.includes("--yes") || argv.includes("-y") || argv.includes("--no-prompt")) {
    return true;
  }
  if (!input.isTTY || !output.isTTY) return true;
  return false;
}

/** Returns trimmed email or null if skipped / empty / invalid-looking. */
export async function askEmail(question: string): Promise<string | null> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(question)).trim();
    if (!answer) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
      console.log("  Skipping — that does not look like an email address.");
      return null;
    }
    return answer.toLowerCase();
  } finally {
    rl.close();
  }
}
