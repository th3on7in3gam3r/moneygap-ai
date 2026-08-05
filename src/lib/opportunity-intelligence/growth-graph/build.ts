import type {
  CustomerQuestion,
  GrowthGraphEdgeDraft,
  GrowthGraphNodeDraft,
  KeywordCluster,
  OiRecommendationDraft,
  SemanticEntity,
} from "@/lib/opportunity-intelligence/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function buildGrowthGraphDrafts(input: {
  domain: string;
  moneyGapScore: number | null;
  pages: { url: string; title: string | null; pageType: string }[];
  products: string[];
  services: string[];
  clusters: KeywordCluster[];
  entities: SemanticEntity[];
  questions: CustomerQuestion[];
  competitors: string[];
  recommendations: OiRecommendationDraft[];
  aiReadinessScore?: number | null;
}): { nodes: GrowthGraphNodeDraft[]; edges: GrowthGraphEdgeDraft[] } {
  const nodes: GrowthGraphNodeDraft[] = [];
  const edges: GrowthGraphEdgeDraft[] = [];

  const websiteId = "node-website";
  nodes.push({
    tempId: websiteId,
    nodeType: "website",
    label: input.domain,
    slug: slugify(input.domain),
  });

  if (input.moneyGapScore != null) {
    const scoreId = "node-moneygap-score";
    nodes.push({
      tempId: scoreId,
      nodeType: "moneygap_score",
      label: `MoneyGap Score™ ${input.moneyGapScore}`,
      slug: "moneygap-score",
      meta: { score: input.moneyGapScore },
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: scoreId,
      edgeType: "improves_score",
      weight: 2,
    });
  }

  if (input.aiReadinessScore != null) {
    const aiId = "node-ai-readiness";
    nodes.push({
      tempId: aiId,
      nodeType: "ai_readiness",
      label: `AI Readiness ${input.aiReadinessScore}`,
      slug: "ai-readiness",
      meta: { score: input.aiReadinessScore },
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: aiId,
      edgeType: "improves_score",
    });
  }

  for (const [i, page] of input.pages.slice(0, 40).entries()) {
    const id = `node-page-${i}`;
    nodes.push({
      tempId: id,
      nodeType: "page",
      label: page.title || page.url,
      slug: slugify(page.url),
      meta: { url: page.url, pageType: page.pageType },
    });
    edges.push({ fromTempId: websiteId, toTempId: id, edgeType: "has_page" });
  }

  for (const [i, p] of input.products.slice(0, 12).entries()) {
    const id = `node-product-${i}`;
    nodes.push({
      tempId: id,
      nodeType: "product",
      label: p,
      slug: slugify(p),
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: id,
      edgeType: "offers_product",
    });
  }

  for (const [i, s] of input.services.slice(0, 12).entries()) {
    const id = `node-service-${i}`;
    nodes.push({
      tempId: id,
      nodeType: "service",
      label: s,
      slug: slugify(s),
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: id,
      edgeType: "offers_service",
    });
  }

  for (const cluster of input.clusters.slice(0, 16)) {
    const topicId = `node-topic-${cluster.id}`;
    nodes.push({
      tempId: topicId,
      nodeType: "topic",
      label: cluster.label,
      slug: slugify(cluster.label),
      meta: { intent: cluster.intent },
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: topicId,
      edgeType: "about_topic",
      weight: Math.round(cluster.demandProxy * 10),
    });

    const intentId = `node-intent-${cluster.id}`;
    nodes.push({
      tempId: intentId,
      nodeType: "intent",
      label: cluster.intent,
      slug: `intent-${cluster.intent}`,
    });
    edges.push({
      fromTempId: topicId,
      toTempId: intentId,
      edgeType: "has_intent",
    });

    for (const [ki, kw] of cluster.keywords.slice(0, 5).entries()) {
      const kwId = `node-kw-${cluster.id}-${ki}`;
      nodes.push({
        tempId: kwId,
        nodeType: "keyword",
        label: kw.term,
        slug: slugify(kw.term),
        meta: { kind: kw.kind },
      });
      edges.push({
        fromTempId: topicId,
        toTempId: kwId,
        edgeType: "targets_keyword",
      });
    }
  }

  for (const ent of [...input.entities].slice(0, 20)) {
    nodes.push({
      tempId: `node-${ent.id}`,
      nodeType: "entity",
      label: ent.label,
      slug: slugify(ent.label),
      meta: { entityType: ent.type, recommended: ent.recommended ?? false },
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: `node-${ent.id}`,
      edgeType: "mentions_entity",
    });
  }

  for (const question of input.questions.slice(0, 12)) {
    nodes.push({
      tempId: `node-${question.id}`,
      nodeType: "question",
      label: question.question,
      slug: slugify(question.id),
      meta: { intent: question.intent },
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: `node-${question.id}`,
      edgeType: "asks_question",
    });
  }

  for (const [i, name] of input.competitors.slice(0, 8).entries()) {
    const id = `node-competitor-${i}`;
    nodes.push({
      tempId: id,
      nodeType: "competitor",
      label: name,
      slug: slugify(name),
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: id,
      edgeType: "competes_with",
    });
  }

  for (const [i, rec] of input.recommendations.slice(0, 12).entries()) {
    const id = `node-rev-${i}`;
    nodes.push({
      tempId: id,
      nodeType: "revenue_opportunity",
      label: rec.title,
      slug: slugify(`opp-${i}-${rec.kind}`),
      meta: {
        kind: rec.kind,
        opportunityScore: rec.opportunityScore,
        gap: true,
      },
    });
    edges.push({
      fromTempId: websiteId,
      toTempId: id,
      edgeType: "drives_revenue",
      weight: Math.round(rec.opportunityScore / 10),
    });
    if (input.competitors[0]) {
      edges.push({
        fromTempId: id,
        toTempId: "node-competitor-0",
        edgeType: "gap_vs",
      });
    }
  }

  return { nodes, edges };
}
