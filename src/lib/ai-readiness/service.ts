import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiReadinessLlmsVersions, websites } from "@/db/schema";
import {
  RULESET_VERSION,
  calculateAIReadiness,
  detectKnowledgeResources,
  generateLlmsFile,
  validateLlmsFile,
} from "@/lib/ai-readiness";


export async function getWebsiteForWorkspace(
  workspaceId: string,
  websiteId: string,
) {
  const [site] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);
  if (!site || site.workspaceId !== workspaceId) return null;
  return site;
}

export async function fetchRemoteLlms(url: string): Promise<string | null> {
  try {
    const origin = new URL(url).origin;
    const res = await fetch(`${origin}/llms.txt`, {
      redirect: "follow",
      headers: { "User-Agent": "MoneyGapAIReadiness/1.0" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.text();
    return body.trim().length > 0 ? body : null;
  } catch {
    return null;
  }
}

export async function summarizeWebsiteAiReadiness(input: {
  workspaceId: string;
  websiteId: string;
}) {
  const site = await getWebsiteForWorkspace(input.workspaceId, input.websiteId);
  if (!site) return { ok: false as const, error: "Website not found" };

  const remote = await fetchRemoteLlms(site.url);
  const validation = validateLlmsFile(remote);
  const knowledge = detectKnowledgeResources([
    site.url,
    `${new URL(site.url).origin}/docs`,
    `${new URL(site.url).origin}/contact`,
    `${new URL(site.url).origin}/faq`,
    `${new URL(site.url).origin}/blog`,
  ]);

  const readiness = calculateAIReadiness({
    llmsPresent: validation.present && !validation.empty,
    llmsValidationScore: validation.present ? validation.score : null,
    hasJsonLd: false,
    hasOrganizationSchema: false,
    hasFaqSchema: false,
    hasArticleSchema: false,
    hasSemanticHeadings: true,
    hasCanonical: true,
    hasContactTransparency: knowledge.some((k) => k.kind === "support"),
    hasDocumentation: knowledge.some((k) => k.kind === "docs"),
    knowledgeResourceCount: knowledge.length,
  });

  const versions = await db
    .select({
      id: aiReadinessLlmsVersions.id,
      score: aiReadinessLlmsVersions.score,
      rulesetVersion: aiReadinessLlmsVersions.rulesetVersion,
      createdAt: aiReadinessLlmsVersions.createdAt,
      contentPreview: aiReadinessLlmsVersions.content,
    })
    .from(aiReadinessLlmsVersions)
    .where(eq(aiReadinessLlmsVersions.websiteId, site.id))
    .orderBy(desc(aiReadinessLlmsVersions.createdAt))
    .limit(10);

  return {
    ok: true as const,
    website: {
      id: site.id,
      name: site.name,
      domain: site.domain,
      url: site.url,
    },
    remotePresent: Boolean(remote),
    validation,
    readiness,
    versions: versions.map((v) => ({
      id: v.id,
      score: v.score,
      rulesetVersion: v.rulesetVersion,
      createdAt: v.createdAt,
      preview: v.contentPreview.slice(0, 120),
    })),
    rulesetVersion: RULESET_VERSION,
  };
}

export async function generateAndStoreLlms(input: {
  workspaceId: string;
  websiteId: string;
}) {
  const site = await getWebsiteForWorkspace(input.workspaceId, input.websiteId);
  if (!site) return { ok: false as const, error: "Website not found" };

  const origin = new URL(site.url).origin;
  const content = generateLlmsFile({
    organizationName: site.name,
    domain: site.domain || origin,
    summary: `${site.name} — analyzed with MoneyGap AI Readiness Engine™.`,
    importantUrls: [
      { label: "Home", url: origin + "/" },
      { label: "Site", url: site.url },
    ],
    documentationUrls: [`${origin}/docs`],
    contactUrl: `${origin}/contact`,
    supportUrl: `${origin}/contact`,
    faqUrl: `${origin}/faq`,
    knowledgeUrls: [`${origin}/blog`],
    canonicalResources: [origin + "/", site.url],
  });

  const validation = validateLlmsFile(content);
  const [row] = await db
    .insert(aiReadinessLlmsVersions)
    .values({
      workspaceId: input.workspaceId,
      websiteId: site.id,
      content,
      score: validation.score,
      rulesetVersion: RULESET_VERSION,
    })
    .returning();

  return {
    ok: true as const,
    content,
    validation,
    version: row,
  };
}
