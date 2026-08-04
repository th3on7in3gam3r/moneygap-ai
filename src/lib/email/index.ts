export * from "./types";
export { getEmailProvider } from "./providers";
export { sendEmail, siteOrigin } from "./services/send";
export {
  getOrCreateEmailPreferences,
  updateEmailPreferences,
  unsubscribeMarketing,
} from "./preferences/service";
export { runGrowthDigestJob } from "./scheduler/run";
export { ruleBasedDigestContent } from "./digest/compose";
export type { DigestContentProvider } from "./digest/content";
