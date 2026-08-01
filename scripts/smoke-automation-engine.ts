import { buildWorkflowSteps } from "../src/lib/automation/workflow-build";
import { agentSlugForModule } from "../src/lib/automation/flag";

const steps = buildWorkflowSteps({
  title: "Add review requests",
  agentSlug: "trust",
  kind: "reviews",
  whatsMissing: "No post-purchase review ask",
  contextNotes: ["Industry: local_business"],
});

if (steps.steps.length < 4) throw new Error("expected workflow steps");
if (!steps.summary.toLowerCase().includes("draft")) {
  throw new Error("must mention draft");
}

if (agentSlugForModule("seo") !== "seo") throw new Error("seo agent map");
if (agentSlugForModule("marketing") !== "marketing") {
  throw new Error("marketing agent map");
}
if (agentSlugForModule("unknown_mod") !== "automation") {
  throw new Error("fallback agent");
}

function flagEnabled(v: string | undefined) {
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
if (!flagEnabled(undefined)) throw new Error("enabled by default");
if (flagEnabled("0")) throw new Error("flag soft-skip path");

console.log("automation-engine smoke OK", {
  kind: steps.kind,
  stepCount: steps.steps.length,
  agentSeo: agentSlugForModule("seo"),
});
