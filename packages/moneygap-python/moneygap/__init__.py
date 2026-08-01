"""MoneyGap Python SDK (thin stub).

Wraps MoneyGap API™ `/api/v1` — see docs/api-platform.md and docs/plugin-sdk.md
"""

from __future__ import annotations

from typing import Any, Optional

try:
    import urllib.request
    import json
except ImportError:  # pragma: no cover
    pass


MARKETPLACE_EVENTS = (
    "listing.installed",
    "listing.uninstalled",
    "review.created",
    "academy.lesson_completed",
    "creator.revenue_attributed",
)


class MoneyGapClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def _request(self, path: str, method: str = "GET", body: Optional[dict] = None) -> Any:
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def analyze(self, url: str) -> Any:
        return self._request("/api/v1/analyze", method="POST", body={"url": url})

    def get_report(self, report_id: str) -> Any:
        return self._request(f"/api/v1/reports/{report_id}")

    def get_website_score(self, website_id: str) -> Any:
        return self._request(f"/api/v1/websites/{website_id}/score")

    def get_website_opportunities(self, website_id: str) -> Any:
        return self._request(f"/api/v1/websites/{website_id}/opportunities")
