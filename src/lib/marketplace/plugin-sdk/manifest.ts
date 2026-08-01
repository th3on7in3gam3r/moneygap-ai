export type PluginCapability =
  | "install"
  | "widget"
  | "recipe"
  | "pack"
  | "fix_path"
  | "academy";

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  category: string;
  capabilities: PluginCapability[];
  /** Reserved — ignored until a runtime ships */
  entrypoint?: string;
  source?: {
    automationTemplateSlug?: string;
    kgIndustrySlug?: string;
    kgPlaybookSlug?: string;
    fixPathId?: string;
    agentSlug?: string;
  };
};

export const MARKETPLACE_EVENTS = [
  "listing.installed",
  "listing.uninstalled",
  "review.created",
  "academy.lesson_completed",
  "creator.revenue_attributed",
] as const;

export type MarketplaceEventName = (typeof MARKETPLACE_EVENTS)[number];

export function validateManifest(
  input: unknown,
): { ok: true; manifest: PluginManifest } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Manifest must be an object" };
  }
  const m = input as Partial<PluginManifest>;
  if (!m.id || !m.name || !m.version || !m.category) {
    return { ok: false, error: "id, name, version, category required" };
  }
  if (!Array.isArray(m.capabilities)) {
    return { ok: false, error: "capabilities must be an array" };
  }
  return {
    ok: true,
    manifest: {
      id: m.id,
      name: m.name,
      version: m.version,
      category: m.category,
      capabilities: m.capabilities as PluginCapability[],
      entrypoint: m.entrypoint,
      source: m.source,
    },
  };
}
