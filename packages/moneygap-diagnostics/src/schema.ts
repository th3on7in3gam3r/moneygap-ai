import type { DiagnosticFinding } from "./types.js";

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const body = match[1]?.trim();
    if (body) blocks.push(body);
  }
  return blocks;
}

function collectTypes(node: unknown, into: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, into);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") into.add(t);
  else if (Array.isArray(t)) {
    for (const x of t) if (typeof x === "string") into.add(x);
  }
  if (obj["@graph"]) collectTypes(obj["@graph"], into);
}

export function checkSchema(html: string): {
  findings: DiagnosticFinding[];
  schemaTypes: string[];
  hasJsonLd: boolean;
} {
  const findings: DiagnosticFinding[] = [];
  const blocks = extractJsonLdBlocks(html);
  const schemaTypes = new Set<string>();
  let validCount = 0;
  let invalidCount = 0;

  if (blocks.length === 0) {
    findings.push({
      id: "schema.missing",
      category: "schema",
      severity: "warn",
      title: "No JSON-LD structured data",
      detail:
        "No application/ld+json blocks found. Schema helps AI/search understand Organization, FAQ, Product, and more.",
    });
    return { findings, schemaTypes: [], hasJsonLd: false };
  }

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block) as unknown;
      validCount += 1;
      collectTypes(parsed, schemaTypes);

      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        if (!root || typeof root !== "object") continue;
        const obj = root as Record<string, unknown>;
        const ctx = obj["@context"];
        const hasContext =
          typeof ctx === "string" ||
          (typeof ctx === "object" && ctx !== null) ||
          Array.isArray(ctx);
        if (!hasContext && !obj["@graph"]) {
          findings.push({
            id: "schema.missing_context",
            category: "schema",
            severity: "warn",
            title: "JSON-LD missing @context",
            detail:
              "A JSON-LD block is valid JSON but lacks @context. Prefer https://schema.org.",
          });
        }
      }
    } catch {
      invalidCount += 1;
    }
  }

  if (invalidCount > 0) {
    findings.push({
      id: "schema.invalid_json",
      category: "schema",
      severity: "fail",
      title: "Invalid JSON-LD",
      detail: `${invalidCount} JSON-LD script(s) failed to parse as JSON.`,
    });
  }

  if (validCount > 0) {
    const types = [...schemaTypes];
    findings.push({
      id: "schema.present",
      category: "schema",
      severity: "pass",
      title: "Structured data detected",
      detail:
        types.length > 0
          ? `Found valid JSON-LD with types: ${types.slice(0, 8).join(", ")}${types.length > 8 ? "…" : ""}.`
          : `Found ${validCount} valid JSON-LD block(s).`,
    });

    const useful = ["Organization", "WebSite", "FAQPage", "Product", "BreadcrumbList", "LocalBusiness"];
    const hasUseful = useful.some((t) => schemaTypes.has(t));
    if (!hasUseful) {
      findings.push({
        id: "schema.weak_types",
        category: "schema",
        severity: "info",
        title: "Consider richer schema types",
        detail:
          "Add Organization, WebSite, FAQPage, or BreadcrumbList where relevant to improve AI/search visibility.",
      });
    }
  }

  return {
    findings,
    schemaTypes: [...schemaTypes],
    hasJsonLd: validCount > 0,
  };
}
