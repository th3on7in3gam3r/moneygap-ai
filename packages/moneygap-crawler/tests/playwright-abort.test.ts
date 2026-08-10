import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const closePage = vi.fn(async () => undefined);
const closeContext = vi.fn(async () => undefined);

vi.mock("playwright", () => {
  return {
    chromium: {
      launch: vi.fn(async () => ({
        newContext: vi.fn(async () => ({
          newPage: vi.fn(async () => ({
            goto: vi.fn(
              () =>
                new Promise(() => {
                  /* hang until abort closes */
                }),
            ),
            waitForTimeout: vi.fn(async () => undefined),
            content: vi.fn(async () => "<html></html>"),
            url: vi.fn(() => "https://example.com/"),
            close: closePage,
          })),
          close: closeContext,
        })),
        close: vi.fn(async () => undefined),
      })),
    },
  };
});

describe("playwright abort cleanup", () => {
  beforeEach(() => {
    closePage.mockClear();
    closeContext.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("closes page and context when AbortSignal aborts during render", async () => {
    const { renderWithPlaywright } =
      await import("../src/renderers/playwright.js");
    const controller = new AbortController();

    const pending = renderWithPlaywright("https://example.com/", {
      timeoutMs: 30_000,
      userAgent: "test-agent",
      signal: controller.signal,
    });

    // Let launch/context/page start, then abort (outer withTimeout pattern).
    await new Promise((r) => setTimeout(r, 50));
    controller.abort();

    const result = await pending;
    expect(result).toBeNull();
    expect(closePage).toHaveBeenCalled();
    expect(closeContext).toHaveBeenCalled();
  });
});
