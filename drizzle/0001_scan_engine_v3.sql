-- Scan Engine V3: durable jobs/stages + website_pages uniqueness
-- Safe dedupe: keep richest markdown per (analysis_id, url)

DELETE FROM website_pages a
USING website_pages b
WHERE a.analysis_id = b.analysis_id
  AND a.url = b.url
  AND a.id < b.id
  AND length(coalesce(a.markdown, '')) <= length(coalesce(b.markdown, ''));

DELETE FROM website_pages a
USING website_pages b
WHERE a.analysis_id = b.analysis_id
  AND a.url = b.url
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS website_pages_analysis_url_uidx
  ON website_pages (analysis_id, url);

CREATE TABLE IF NOT EXISTS scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES website_analyses(id) ON DELETE CASCADE,
  profile text NOT NULL DEFAULT 'quick',
  status text NOT NULL DEFAULT 'queued',
  current_stage text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_heartbeat_at timestamptz,
  worker_id text,
  error_class text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS scan_jobs_analysis_uidx ON scan_jobs (analysis_id);
CREATE INDEX IF NOT EXISTS scan_jobs_status_idx ON scan_jobs (status);

CREATE TABLE IF NOT EXISTS scan_job_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id uuid NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  stage text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  error_class text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS scan_job_stages_job_stage_uidx
  ON scan_job_stages (scan_job_id, stage);
CREATE INDEX IF NOT EXISTS scan_job_stages_status_idx ON scan_job_stages (status);
CREATE INDEX IF NOT EXISTS scan_job_stages_lease_idx ON scan_job_stages (lease_expires_at);
