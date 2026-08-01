export { isMarketplaceEnabled } from "@/lib/marketplace/flag";
export {
  ensureMarketplaceCatalog,
  listListings,
  getListingBySlug,
  installListing,
  upsertReview,
  getMarketplaceAnalytics,
} from "@/lib/marketplace/catalog";
export { listPartners, ensurePartners } from "@/lib/marketplace/partners";
export {
  listAcademy,
  completeLesson,
  ensureAcademy,
} from "@/lib/marketplace/academy";
export {
  listVerifiedInsights,
  ensureVerifiedInsights,
} from "@/lib/marketplace/verified-patterns";
export {
  validateManifest,
  MARKETPLACE_EVENTS,
  type PluginManifest,
} from "@/lib/marketplace/plugin-sdk";
