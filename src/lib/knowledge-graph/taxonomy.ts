export const KNOWLEDGE_GRAPH_VERSION = "1.4.0";

export type KgEntryStatus = "active" | "draft" | "deprecated";

export const KG_PATTERN_CATEGORIES = [
  "revenue",
  "acquisition",
  "seo",
  "authority",
  "trust",
  "conversion",
  "retention",
  "automation",
  "ai_adoption",
] as const;

export type KgPatternCategoryTaxonomy = (typeof KG_PATTERN_CATEGORIES)[number];

/** Foundation entity types (Phase 13.1 brief). */
export const KG_ENTITY_TYPES = [
  "revenue_strategy",
  "trust_signal",
  "conversion_strategy",
  "conversion_tactic",
  "marketing_channel",
  "seo_strategy",
  "automation_strategy",
  "technology_pattern",
  "authority_signal",
  "content_type",
  "growth_opportunity",
  "acquisition_method",
  "retention_strategy",
] as const;

export type KgEntityType = (typeof KG_ENTITY_TYPES)[number];

export type IndustrySlug =
  | "saas"
  | "ecommerce"
  | "healthcare"
  | "legal"
  | "restaurants"
  | "real_estate"
  | "churches"
  | "nonprofits"
  | "education"
  | "financial_services"
  | "professional_services"
  | "local_services"
  | "creator_economy";

export type BusinessModelSlug =
  | "subscription"
  | "marketplace"
  | "agency"
  | "consulting"
  | "membership"
  | "digital_products"
  | "local_business"
  | "franchise"
  | "nonprofit"
  | "hybrid"
  | "product_commerce"
  | "lead_generation"
  | "advertising"
  | "transaction_based";

export const INDUSTRY_KEYWORDS: Record<IndustrySlug, string[]> = {
  saas: ["saas", "software", "b2b software", "platform", "app", "cloud", "free trial", "api"],
  ecommerce: ["ecommerce", "e-commerce", "online store", "shopify", "retail", "dtc", "add to cart", "checkout"],
  healthcare: ["healthcare", "health", "medical", "clinic", "dental", "wellness", "patient"],
  legal: ["legal", "law firm", "attorney", "lawyer", "counsel"],
  restaurants: ["restaurant", "cafe", "dining", "food service", "bar", "menu", "reservations"],
  real_estate: ["real estate", "realty", "property", "broker", "realtor"],
  churches: ["church", "ministry", "congregation", "worship", "faith", "sermon", "giving"],
  nonprofits: ["nonprofit", "non-profit", "charity", "foundation", "ngo", "donate", "donation"],
  education: ["education", "school", "university", "course", "learning", "academy"],
  financial_services: ["finance", "financial", "banking", "insurance", "fintech", "wealth"],
  professional_services: ["consulting", "agency", "professional services", "accounting", "advisory"],
  local_services: [
    "local business",
    "home services",
    "plumber",
    "hvac",
    "salon",
    "local",
    "service area",
    "get a quote",
  ],
  creator_economy: [
    "creator",
    "newsletter",
    "substack",
    "youtube",
    "podcast",
    "digital course",
    "membership community",
    "patreon",
    "influencer",
  ],
};

export const MODEL_KEYWORDS: Record<BusinessModelSlug, string[]> = {
  subscription: ["subscription", "saas", "recurring", "monthly plan", "per seat"],
  marketplace: ["marketplace", "two-sided", "platform marketplace", "sellers and buyers"],
  agency: ["agency", "retainer", "client services"],
  consulting: ["consulting", "advisory", "professional services"],
  membership: ["membership", "members", "community membership", "member portal"],
  digital_products: ["digital product", "course", "template", "ebook", "download"],
  local_business: ["local", "brick and mortar", "storefront", "appointment"],
  franchise: ["franchise", "franchisor"],
  nonprofit: ["nonprofit", "donation", "donate", "501", "giving"],
  hybrid: ["hybrid", "mixed model"],
  product_commerce: ["add to cart", "checkout", "online store", "shop now", "sku", "shipping"],
  lead_generation: ["get a quote", "contact us", "book a call", "lead form", "request demo", "consultation"],
  advertising: ["advertise", "sponsorship", "cpm", "media kit", "ad inventory", "sponsored"],
  transaction_based: ["transaction fee", "take rate", "per transaction", "payment processing", "booking fee"],
};

/** Light corpus cues that reinforce industry detection. */
export const CORPUS_INDUSTRY_CUES: Partial<Record<IndustrySlug, string[]>> = {
  saas: ["pricing", "free trial", "docs", "api reference", "changelog", "sign up"],
  ecommerce: ["add to cart", "checkout", "shipping", "sku", "product"],
  restaurants: ["menu", "reservations", "order online", "hours"],
  churches: ["sermon", "service times", "give", "tithe", "worship"],
  nonprofits: ["donate", "impact", "volunteer", "501(c)"],
  local_services: ["get a quote", "call now", "service area", "book online"],
  professional_services: ["case study", "our services", "book a call", "consultation"],
  creator_economy: ["subscribe", "join the community", "digital download", "podcast"],
};

/** Corpus cues that reinforce business model detection (Phase 13.3). */
export const CORPUS_MODEL_CUES: Partial<Record<BusinessModelSlug, string[]>> = {
  subscription: ["free trial", "pricing", "plans", "billing", "subscribe"],
  product_commerce: ["add to cart", "checkout", "cart", "buy now", "shipping"],
  lead_generation: ["get a quote", "contact form", "book a call", "schedule", "lead"],
  marketplace: ["sell on", "become a seller", "listings", "buyers and sellers"],
  advertising: ["advertise with us", "media kit", "sponsorship", "cpm"],
  transaction_based: ["booking fee", "service fee", "transaction", "pay per"],
  membership: ["join", "member", "membership", "exclusive access"],
  nonprofit: ["donate", "give now", "recurring gift", "501"],
  digital_products: ["download", "course", "instant access", "digital download"],
  agency: ["our work", "case studies", "retainer", "hire us"],
};

export function isActiveStatus(status: string | null | undefined): boolean {
  return !status || status === "active";
}
