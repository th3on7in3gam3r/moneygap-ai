import type { OnProgress, ProgressEvent, ProgressPhase } from "../types/index.js";

export function memoryMb(): number | null {
  try {
    return Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
  } catch {
    return null;
  }
}

export class ProgressTracker {
  private errors: string[] = [];
  private warnings: string[] = [];
  private started = Date.now();
  private processedTimes: number[] = [];

  constructor(private onProgress?: OnProgress) {}

  warn(msg: string) {
    this.warnings.push(msg);
    if (this.warnings.length > 50) this.warnings.shift();
  }

  error(msg: string) {
    this.errors.push(msg);
    if (this.errors.length > 50) this.errors.shift();
  }

  markProcessed(durationMs: number) {
    this.processedTimes.push(durationMs);
    if (this.processedTimes.length > 40) this.processedTimes.shift();
  }

  async emit(partial: {
    phase: ProgressPhase;
    pagesDiscovered: number;
    pagesProcessed: number;
    pagesRemaining: number;
    pagesFailed?: number;
    currentUrl?: string | null;
    message: string;
  }): Promise<ProgressEvent> {
    const avg =
      this.processedTimes.length > 0
        ? this.processedTimes.reduce((a, b) => a + b, 0) / this.processedTimes.length
        : null;
    const etaMs =
      avg != null && partial.pagesRemaining > 0
        ? Math.round(avg * partial.pagesRemaining)
        : null;

    const event: ProgressEvent = {
      phase: partial.phase,
      pagesDiscovered: partial.pagesDiscovered,
      pagesProcessed: partial.pagesProcessed,
      pagesRemaining: partial.pagesRemaining,
      pagesFailed: partial.pagesFailed ?? this.errors.length,
      currentUrl: partial.currentUrl ?? null,
      etaMs,
      memoryMb: memoryMb(),
      errors: [...this.errors],
      warnings: [...this.warnings],
      message: partial.message,
    };
    await this.onProgress?.(event);
    return event;
  }

  durationMs() {
    return Date.now() - this.started;
  }

  getWarnings() {
    return [...this.warnings];
  }
}
