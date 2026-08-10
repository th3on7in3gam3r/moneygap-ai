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

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
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
  opts: {
    timeoutMs: number;
    userAgent: string;
    signal?: AbortSignal;
  },
): Promise<RenderResult | null> {
  if (opts.signal?.aborted) return null;

  const timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : 15_000;
  const browser = await getBrowser(Math.min(timeoutMs, 15_000));
  if (!browser) return null;

  const started = Date.now();
  let context: import("playwright").BrowserContext | null = null;
  let page: import("playwright").Page | null = null;

  const onAbort = () => {
    void page?.close().catch(() => undefined);
    void context?.close().catch(() => undefined);
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    if (opts.signal?.aborted) return null;

    context = await abortable(
      raceTimeout(
        browser.newContext({
          userAgent: opts.userAgent,
          javaScriptEnabled: true,
        }),
        10_000,
        "playwright.newContext",
      ),
      opts.signal,
    );
    page = await abortable(
      raceTimeout(context.newPage(), 10_000, "playwright.newPage"),
      opts.signal,
    );

    if (opts.signal?.aborted) return null;

    const res = await abortable(
      page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      }),
      opts.signal,
    );
    if (opts.signal?.aborted) return null;

    await abortable(
      page.waitForTimeout(Math.min(400, timeoutMs)),
      opts.signal,
    );
    if (opts.signal?.aborted) return null;

    const html = await abortable(
      raceTimeout(
        page.content(),
        Math.max(5_000, timeoutMs),
        "playwright.content",
      ),
      opts.signal,
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
    opts.signal?.removeEventListener("abort", onAbort);
    if (page) {
      await page.close().catch(() => undefined);
      page = null;
    }
    if (context) {
      await raceTimeout(context.close(), 5_000, "playwright.contextClose").catch(
        () => undefined,
      );
      context = null;
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
