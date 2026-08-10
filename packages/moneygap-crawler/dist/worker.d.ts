type JobRow = {
    id: string;
    url: string;
    mode: string;
    max_pages: number;
    status: string;
    analysis_id: string | null;
};
declare function notifyScanComplete(analysisId: string): Promise<void>;
/** Drain pre-enqueued crawl_pages for a product Engine analysis. */
declare function processProductJob(job: JobRow): Promise<void>;
declare function main(): Promise<void>;

export { notifyScanComplete, processProductJob, main as runCrawlWorker };
