# MoneyGap Scan Engine

Durable lease-based stage machine for website scans (V3).

- Stage registry + profile matrix (Basics skips competitive; lite findings/roadmap)
- Atomic claim SQL with lease reclaim
- Heartbeat helpers + worker loop (`processOneScanStage`)

Consumed by `scripts/scan-engine-worker.ts` and Vercel control-plane APIs.
Enable with `SCAN_ENGINE_V3=1`.
