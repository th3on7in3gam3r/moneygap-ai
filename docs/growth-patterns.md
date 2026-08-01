# Verified Growth Patterns™

## Mission

Surface aggregated, anonymized business improvement patterns so teams see **observed trends and insights**—never guarantees or revenue promises.

## Phase

Phase 22 Marketplace™ (product surface). Catalog substrate remains **Phase 13.4 Growth Pattern Library™** ([`growth-pattern-library.md`](./growth-pattern-library.md)).

## Principles

- Always label as **observed trend** / insight.
- Soft-fail; never block Engine or Phase 2 reports.
- Anonymized: sample-size bands, no workspace PII in public insights.
- Distinct from KG pattern matching used inside reports.

## Data

`verified_growth_insights` rows include: title, insight, evidence JSON, sampleSizeBand, confidence, `labeled: "observed_trend"`, status.

Sources may include: KG pattern aggregates, marketplace install signals, anonymized completion bands.

## Surfaces

- Marketplace **Insights** tab
- `GET /api/marketplace/insights`

## Related

- [`marketplace.md`](./marketplace.md)
- [`growth-pattern-library.md`](./growth-pattern-library.md)
- [`prediction-confidence.md`](./prediction-confidence.md) (confidence is not a promise)

## Out of scope

Guaranteed ROI; live cohort analytics warehouse; selling insight datasets.
