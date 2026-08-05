/**
 * robots-parser type shim — package ships without complete types.
 */
declare module "robots-parser" {
  interface Robots {
    isAllowed(url: string, userAgent?: string): boolean | undefined;
    getCrawlDelay(userAgent?: string): number | undefined;
    getSitemaps(): string[];
  }
  export default function robotsParser(url: string, contents: string): Robots;
}
