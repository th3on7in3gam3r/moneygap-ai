"""MoneyGap Python SDK (thin REST client).

Wraps MoneyGap API™ `/api/v1` — see https://moneygap-ai.com/docs/moneygap-api
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any, Mapping, Optional


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

    def _request(
        self,
        path: str,
        method: str = "GET",
        body: Optional[Mapping[str, Any]] = None,
    ) -> Any:
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
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(raw)
                message = payload.get("error") or raw
            except json.JSONDecodeError:
                message = raw or str(exc)
            raise RuntimeError(message) from exc

    def analyze(
        self,
        website_url: str,
        *,
        industry: Optional[str] = None,
        business_type: Optional[str] = None,
        target_audience: Optional[str] = None,
    ) -> Any:
        body: dict[str, Any] = {"website_url": website_url}
        if industry:
            body["industry"] = industry
        if business_type:
            body["business_type"] = business_type
        if target_audience:
            body["target_audience"] = target_audience
        return self._request("/api/v1/analyze", method="POST", body=body)

    def get_analysis_status(self, analysis_id: str) -> Any:
        return self._request(f"/api/v1/analyze/{analysis_id}/status")

    def get_report(self, report_id: str) -> Any:
        return self._request(f"/api/v1/reports/{report_id}")

    def get_website_score(self, website_id: str) -> Any:
        return self._request(f"/api/v1/websites/{website_id}/score")

    def get_website_opportunities(self, website_id: str) -> Any:
        return self._request(f"/api/v1/websites/{website_id}/opportunities")
