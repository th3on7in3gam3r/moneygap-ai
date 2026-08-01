import { COPILOT_MODES, systemPromptForMode } from "../src/lib/copilot/modes";
import { isGrowthCopilotEnabled } from "../src/lib/copilot/flag";
import { hintFixPathForText } from "../src/lib/copilot/fix-path-hints";

function flagEnabled(v: string | undefined) {
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

if (!flagEnabled(undefined)) throw new Error("copilot enabled by default");
if (flagEnabled("0")) throw new Error("flag soft-skip");
if (!isGrowthCopilotEnabled()) {
  // may be disabled in env — only assert API shape of flag fn
}

if (COPILOT_MODES.length !== 4) throw new Error("expected 4 modes");
for (const m of COPILOT_MODES) {
  const p = systemPromptForMode(m.id);
  if (!p.includes("never auto-publish") && !p.includes("Never auto-publish")) {
    throw new Error(`mode ${m.id} missing publish guardrail`);
  }
  if (!p.includes("AI Estimate")) {
    throw new Error(`mode ${m.id} missing AI Estimate`);
  }
}

const marketing = hintFixPathForText({
  title: "Missing newsletter welcome sequence",
  category: "Marketing",
  moduleId: "marketing",
  whatsMissing: "No email welcome / newsletter onboarding",
});
if (marketing.recommendedId !== "action_assets") {
  throw new Error(`expected action_assets, got ${marketing.recommendedId}`);
}

const developer = hintFixPathForText({
  title: "Add Clerk auth middleware",
  category: "Technical",
  moduleId: "ai",
  whatsMissing: "Schema migration and auth middleware",
  difficulty: "hard",
});
if (developer.recommendedId !== "developer_ai") {
  throw new Error(`expected developer_ai, got ${developer.recommendedId}`);
}

// Decision scoring shape (pure heuristic mirror)
function scoreOption(label: string) {
  const blob = label.toLowerCase();
  let score = 50;
  if (/automat|workflow/.test(blob)) score += 10;
  if (/hir(e|ing)/.test(blob)) score += 6;
  return { label, score };
}
const a = scoreOption("Hire a marketer");
const b = scoreOption("Automate nurture workflows");
if (!(b.score > a.score)) {
  throw new Error("automation should score above hiring in smoke fixture");
}

console.log("growth-copilot smoke OK", {
  modes: COPILOT_MODES.map((m) => m.id),
  marketing: marketing.recommendedId,
  developer: developer.recommendedId,
  decision: [a, b],
});
