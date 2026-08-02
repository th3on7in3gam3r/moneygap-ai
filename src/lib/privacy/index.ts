export { runPrivacyAudit } from "./audit";
export { scorePrivacy } from "./score";
export { privacyStatus, privacyStatusTone } from "./status";
export { privacyFindingsToMoneyGaps } from "./to-money-gap";
export {
  CONSENT_CATEGORY_DEFS,
  acceptAllCategories,
  rejectOptionalCategories,
  normalizeCategories,
  defaultCategories,
} from "./categories";
export type { ConsentCategoryId, ConsentCategories } from "./categories";
export {
  COOKIE_CATALOG,
  buildCookieInventory,
} from "./cookie-catalog";
export type { CookieInventoryRow } from "./cookie-catalog";
export {
  CONSENT_SCHEMA_VERSION,
  PRIVACY_POLICY_VERSION,
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_MAX_AGE_SECONDS,
} from "./versions";
export {
  saveConsent,
  getLatestConsent,
  listConsentEvents,
  consentNeedsPrompt,
} from "./consent";
export type {
  PrivacyResult,
  PrivacyFinding,
  PrivacyStatus,
  PrivacyContributors,
  PrivacyContributorKey,
} from "./types";
