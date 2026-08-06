/**
 * Provider abstractions — swap implementations (Neon tick vs Render worker)
 * without changing dashboard APIs.
 */

import type { DiscoveryResult, ScrapedPage } from "moneygap-crawler";
import type { ScanProfile } from "../types";

export interface CrawlerProvider {
  discover(input: {
    url: string;
    profile: ScanProfile;
    onProgress?: (event: {
      phase: string;
      pagesDiscovered: number;
      pagesProcessed: number;
      pagesRemaining: number;
      currentUrl?: string;
      message?: string;
    }) => void | Promise<void>;
  }): Promise<DiscoveryResult>;
  extractPage(url: string): Promise<ScrapedPage | null>;
}

export interface QueueProvider {
  enqueueUrls(jobId: string, urls: string[]): Promise<number>;
  claimBatch(
    jobId: string,
    limit: number,
  ): Promise<Array<{ id: string; url: string; attempts: number }>>;
  markCompleted(
    pageId: string,
    data: { title: string | null; markdown: string; pageType: string; metadata: Record<string, unknown> },
  ): Promise<void>;
  markFailed(pageId: string, error: string, retry: boolean): Promise<void>;
  countByState(jobId: string): Promise<Record<string, number>>;
  reclaimStaleProcessing(
    jobId: string,
    staleMs?: number,
  ): Promise<{ retried: number; failed: number }>;
}

export interface StorageProvider {
  mirrorWebsitePage(input: {
    analysisId: string;
    url: string;
    pageType: string;
    title: string | null;
    markdown: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

export interface ProgressProvider {
  update(analysisId: string, patch: {
    scanPhase?: string;
    stage?: string;
    progress?: number;
    pagesDiscovered?: number;
    pagesCompleted?: number;
    pagesFailed?: number;
    estimatedRemainingMs?: number | null;
    scanMeta?: Record<string, unknown>;
    currentUrl?: string | null;
  }): Promise<void>;
}

export interface NotificationProvider {
  onScanComplete(analysisId: string): Promise<void>;
  onScanFailed(analysisId: string, error: string): Promise<void>;
}
