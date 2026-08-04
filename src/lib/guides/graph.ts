import type { TopicId } from "./types";

/** Directed topic graph for related guides */
export const TOPIC_EDGES: [TopicId, TopicId][] = [
  ["metadata", "open-graph"],
  ["metadata", "twitter-cards"],
  ["open-graph", "schema-org"],
  ["twitter-cards", "open-graph"],
  ["schema-org", "ai-readiness"],
  ["schema-org", "faq-schema"],
  ["schema-org", "organization-schema"],
  ["faq-schema", "schema-org"],
  ["organization-schema", "schema-org"],
  ["ai-readiness", "llms-txt"],
  ["llms-txt", "ai-readiness"],
  ["core-web-vitals", "image-optimization"],
  ["image-optimization", "performance"],
  ["core-web-vitals", "fonts"],
  ["core-web-vitals", "performance"],
  ["performance", "caching"],
  ["seo", "metadata"],
  ["seo", "canonical-urls"],
  ["seo", "robots-txt"],
  ["seo", "sitemap-xml"],
  ["canonical-urls", "sitemap-xml"],
  ["robots-txt", "sitemap-xml"],
  ["structured-data", "schema-org"],
  ["accessibility", "image-optimization"],
  ["deployment", "security-headers"],
  ["deployment", "caching"],
  ["conversion-optimization", "trust-signals"],
  ["trust-signals", "security-headers"],
  ["analytics", "conversion-optimization"],
  ["routing", "canonical-urls"],
];

export function relatedTopicIds(topicId: TopicId, limit = 8): TopicId[] {
  const out: TopicId[] = [];
  const seen = new Set<TopicId>([topicId]);
  for (const [from, to] of TOPIC_EDGES) {
    if (from === topicId && !seen.has(to)) {
      seen.add(to);
      out.push(to);
    }
    if (to === topicId && !seen.has(from)) {
      seen.add(from);
      out.push(from);
    }
  }
  return out.slice(0, limit);
}
