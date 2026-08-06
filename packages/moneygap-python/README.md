# moneygap (Python)

Thin Python client for [MoneyGap API™](https://moneygap-ai.com/docs/moneygap-api).

## Install

```bash
pip install -e packages/moneygap-python
```

Or copy `moneygap/__init__.py` into your project until published to PyPI.

## Usage

```python
from moneygap import MoneyGapClient

client = MoneyGapClient("https://moneygap-ai.com", api_key="mg_test_…")
queued = client.analyze("https://example.com")
status = client.get_analysis_status(queued["id"])
```

## Methods

| Method | Endpoint |
| --- | --- |
| `analyze(website_url, …)` | `POST /api/v1/analyze` (`website_url`) |
| `get_analysis_status(id)` | `GET /api/v1/analyze/{id}/status` |
| `get_website_score(id)` | `GET /api/v1/websites/{id}/score` |
| `get_website_opportunities(id)` | `GET /api/v1/websites/{id}/opportunities` |
| `get_report(id)` | `GET /api/v1/reports/{id}` |

OpenAPI: https://moneygap-ai.com/openapi/moneygap-v1.json
