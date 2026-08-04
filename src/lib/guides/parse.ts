import type { GuideFrontmatter, GuideSections } from "./types";

const SECTION_MAP: Record<string, keyof GuideSections> = {
  "problem overview": "problemOverview",
  "why it matters": "whyItMatters",
  "framework-specific explanation": "frameworkExplanation",
  "framework specific explanation": "frameworkExplanation",
  "step-by-step solution": "steps",
  "step by step solution": "steps",
  "code examples": "codeExamples",
  "common mistakes": "commonMistakes",
  "validation checklist": "validationChecklist",
  "ai readiness notes": "aiReadinessNotes",
  "deployment checklist": "deploymentChecklist",
  "browser extension tips": "extensionTips",
  "extension tips": "extensionTips",
};

export function parseFrontmatter(raw: string): {
  data: GuideFrontmatter;
  body: string;
} {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) {
    return { data: {}, body: text };
  }
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { data: {}, body: text };
  const yaml = text.slice(4, end);
  const body = text.slice(end + 5);
  const data: GuideFrontmatter = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key === "title") data.title = val;
    else if (key === "description") data.description = val;
    else if (key === "difficulty") {
      if (val === "beginner" || val === "intermediate" || val === "advanced") {
        data.difficulty = val;
      }
    } else if (key === "updated") data.updated = val;
    else if (key === "tags" || key === "cliCommands") {
      const arr = parseYamlList(val, yaml, key);
      if (key === "tags") data.tags = arr;
      else data.cliCommands = arr;
    }
  }
  // multi-line list under key
  const tagsBlock = yaml.match(/^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m);
  if (tagsBlock) {
    data.tags = tagsBlock[1]!
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }
  const cliBlock = yaml.match(/^cliCommands:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m);
  if (cliBlock) {
    data.cliCommands = cliBlock[1]!
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return { data, body };
}

function parseYamlList(inline: string, _yaml: string, _key: string): string[] {
  if (inline.startsWith("[") && inline.endsWith("]")) {
    return inline
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [];
}

export function splitSections(body: string): GuideSections {
  const lines = body.split("\n");
  const sections: GuideSections = {};
  let current: keyof GuideSections | "extra" | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (!current) return;
    const text = buf.join("\n").trim();
    if (!text) {
      buf = [];
      return;
    }
    if (current === "extra") {
      sections.extra = [sections.extra, text].filter(Boolean).join("\n\n");
    } else {
      sections[current] = text;
    }
    buf = [];
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)\s*$/);
    if (h2) {
      flush();
      const key = SECTION_MAP[h2[1]!.trim().toLowerCase()];
      current = key ?? "extra";
      continue;
    }
    if (current) buf.push(line);
    else {
      // content before first H2 → problem overview fallback
      current = "problemOverview";
      buf.push(line);
    }
  }
  flush();
  return sections;
}

export function mergeSections(
  concept: GuideSections,
  overlay: GuideSections,
): GuideSections {
  return {
    problemOverview: concept.problemOverview ?? overlay.problemOverview,
    whyItMatters: concept.whyItMatters ?? overlay.whyItMatters,
    frameworkExplanation: overlay.frameworkExplanation,
    steps: overlay.steps,
    codeExamples: overlay.codeExamples,
    commonMistakes: [concept.commonMistakes, overlay.commonMistakes]
      .filter(Boolean)
      .join("\n\n"),
    validationChecklist: [concept.validationChecklist, overlay.validationChecklist]
      .filter(Boolean)
      .join("\n\n"),
    aiReadinessNotes: [concept.aiReadinessNotes, overlay.aiReadinessNotes]
      .filter(Boolean)
      .join("\n\n"),
    deploymentChecklist: overlay.deploymentChecklist ?? concept.deploymentChecklist,
    extensionTips: overlay.extensionTips ?? concept.extensionTips,
    extra: [concept.extra, overlay.extra].filter(Boolean).join("\n\n") || undefined,
  };
}
