import type { SemanticEntity } from "@/lib/opportunity-intelligence/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function add(
  target: SemanticEntity[],
  label: string,
  type: SemanticEntity["type"],
  recommended?: boolean,
) {
  const clean = label.trim();
  if (!clean) return;
  if (target.some((e) => e.label.toLowerCase() === clean.toLowerCase())) return;
  target.push({
    id: `ent-${slugify(clean)}`,
    label: clean,
    type,
    recommended,
  });
}

export function discoverEntities(input: {
  industry?: string;
  businessModel?: string;
  products: string[];
  services: string[];
  contentCategories: string[];
  technologies?: string[];
  locationHint?: string;
}): { present: SemanticEntity[]; recommended: SemanticEntity[] } {
  const present: SemanticEntity[] = [];

  if (input.industry) add(present, input.industry, "industry");
  if (input.businessModel) add(present, input.businessModel, "concept");
  for (const p of input.products) add(present, p, "product");
  for (const s of input.services) add(present, s, "service");
  for (const c of input.contentCategories) add(present, c, "concept");
  for (const t of input.technologies ?? []) add(present, t, "technology");
  if (input.locationHint) add(present, input.locationHint, "location");

  const recommended: SemanticEntity[] = [];
  const recs: { label: string; type: SemanticEntity["type"] }[] = [
    { label: `${input.industry ?? "Industry"} standards`, type: "standard" },
    { label: "Implementation framework", type: "framework" },
    { label: "Customer success methodology", type: "concept" },
    { label: "Trust & compliance signals", type: "concept" },
  ];
  if (input.services[0]) {
    recs.push({
      label: `${input.services[0]} comparison criteria`,
      type: "concept",
    });
  }
  for (const r of recs) {
    if (present.some((e) => e.label.toLowerCase() === r.label.toLowerCase()))
      continue;
    add(recommended, r.label, r.type, true);
  }

  return { present, recommended };
}
