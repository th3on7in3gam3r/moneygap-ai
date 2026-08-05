import { detectFramework } from "../framework-detectors/index.js";

export type RenderResult = {
  html: string;
  finalUrl: string;
  statusCode: number;
  fetchMs: number;
  renderedWith: "cheerio" | "playwright";
};

let browserPromise: Promise<import("playwright").Browser> | null = null;

function raceTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function getBrowser(
  launchTimeoutMs: number,
): Promise<import("playwright").Browser | null> {
  try {
    const pw = await import("playwright");
    if (!browserPromise) {
      browserPromise = raceTimeout(
        pw.chromium.launch({
          headless: true,
          args: ["--disable-dev-shm-usage", "--no-sandbox"],
        }),
        launchTimeoutMs,
        "playwright.launch",
      ).catch((err) => {
        browserPromise = null;
        throw err;
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
    await raceTimeout(browser.close(), 5_000, "playwright.close");
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
  const timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : 15_000;
  const browser = await getBrowser(Math.min(timeoutMs, 15_000));
  if (!browser) return null;

  const started = Date.now();
  let context: import("playwright").BrowserContext | null = null;
  try {
    context = await raceTimeout(
      browser.newContext({
        userAgent: opts.userAgent,
        javaScriptEnabled: true,
      }),
      10_000,
      "playwright.newContext",
    );
    const page = await raceTimeout(context.newPage(), 10_000, "playwright.newPage");
    const res = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page.waitForTimeout(Math.min(400, timeoutMs));
    const html = await raceTimeout(
      page.content(),
      Math.max(5_000, timeoutMs),
      "playwright.content",
    );
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
    if (context) {
      await raceTimeout(context.close(), 5_000, "playwright.contextClose").catch(
        () => undefined,
      );
    }
  }
}

export function shouldUsePlaywright(
  html: string,
  playwrightEnabled: boolean,
): boolean {
  if (!playwrightEnabled) return false;
  return detectFramework(html).needsJs;
}
