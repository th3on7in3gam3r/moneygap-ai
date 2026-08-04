import type { DiffPreview, FileDiff } from "@/lib/fixflow/types";

export function isEmptyDiff(preview: DiffPreview): boolean {
  return preview.empty || preview.files.length === 0;
}

export function buildSyntheticFileDiff(input: {
  path: string;
  action: FileDiff["action"];
  content: string;
  explanation: string;
}): FileDiff {
  const lines = input.content.split("\n");
  const body =
    input.action === "create"
      ? lines.map((l) => `+${l}`).join("\n")
      : lines.map((l) => ` ${l}`).join("\n");
  const header =
    input.action === "create"
      ? `--- /dev/null\n+++ b/${input.path}\n@@ -0,0 +1,${lines.length} @@\n`
      : `--- a/${input.path}\n+++ b/${input.path}\n@@\n`;
  return {
    path: input.path,
    action: input.action,
    unifiedDiff: `${header}${body}`,
    explanation: input.explanation,
  };
}

export function buildDiffPreview(files: FileDiff[], summary: string): DiffPreview {
  return {
    files,
    summary,
    empty: files.length === 0,
  };
}
