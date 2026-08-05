import type { QueueState } from "../types/index.js";

export type QueueItem = {
  url: string;
  depth: number;
  state: QueueState;
  attempts: number;
  lastError?: string;
};

export class InMemoryCrawlQueue {
  private items = new Map<string, QueueItem>();
  private order: string[] = [];

  enqueue(url: string, depth: number): boolean {
    if (this.items.has(url)) return false;
    this.items.set(url, { url, depth, state: "queued", attempts: 0 });
    this.order.push(url);
    return true;
  }

  has(url: string): boolean {
    return this.items.has(url);
  }

  size(): number {
    return this.items.size;
  }

  countByState(state: QueueState): number {
    let n = 0;
    for (const item of this.items.values()) if (item.state === state) n++;
    return n;
  }

  nextQueued(): QueueItem | null {
    for (const url of this.order) {
      const item = this.items.get(url);
      if (item?.state === "queued" || item?.state === "retry") return item;
    }
    return null;
  }

  mark(url: string, state: QueueState, lastError?: string): void {
    const item = this.items.get(url);
    if (!item) return;
    if (state === "processing" && item.state !== "processing") {
      item.attempts += 1;
    }
    item.state = state;
    if (lastError) item.lastError = lastError;
  }

  snapshot(): QueueItem[] {
    return this.order.map((u) => this.items.get(u)!).filter(Boolean);
  }
}

export function backoffMs(attempt: number, baseMs = 400): number {
  const exp = Math.min(8, Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return baseMs * 2 ** exp + jitter;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isTransientError(statusCode?: number, message?: string): boolean {
  if (statusCode === 429 || statusCode === 503 || statusCode === 502 || statusCode === 504) {
    return true;
  }
  const m = (message ?? "").toLowerCase();
  return m.includes("timeout") || m.includes("econnreset") || m.includes("socket");
}
