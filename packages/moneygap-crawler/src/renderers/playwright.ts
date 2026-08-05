import { detectFramework } from "../framework-detectors/index.js";

export type RenderResult = {
  html: string;
  finalUrl: string;
  statusCode: number;
  fetchMs: number;
  renderedWith: "cheerio" | "playwright";
};

let browserPromise: Promise<import("playwright").Browser> | null = null;

async function getBrowser(): Promise<import("playwright").Browser | null> {
  try {
    const pw = await import("playwright");
    if (!browserPromise) {
      browserPromise = pw.chromium.launch({
        headless: true,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      });
    }
    return await browserPromise;
  } catch {
    browserPromise = null;
    return null;
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
}

export async function renderWithPlaywright(
  url: string,
  opts: { timeoutMs: number; userAgent: string },
): Promise<RenderResult | null> {
  const browser = await getBrowser();
  if (!browser) return null;

  const started = Date.now();
  const context = await browser.newContext({
    userAgent: opts.userAgent,
    javaScriptEnabled: true,
  });
  try {
    const page = await context.newPage();
    const res = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: opts.timeoutMs,
    });
    await page.waitForTimeout(400);
    const html = await page.content();
    return {
      html,
      finalUrl: page.url(),
      statusCode: res?.status() ?? 200,
      fetchMs: Date.now() - started,
      renderedWith: "playwright",
    };
  } catch {
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function shouldUsePlaywright(
  html: string,
  playwrightEnabled: boolean,
): boolean {
  if (!playwrightEnabled) return false;
  return detectFramework(html).needsJs;
}
