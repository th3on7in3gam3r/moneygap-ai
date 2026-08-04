# moneygap-diagnostics

Shared live-URL diagnostics for MoneyGap CLI (`moneygap-scan`) and the free homepage sandbox.

Checks (heuristic, not full MoneyGap AI):

- Crawlability — robots.txt + sitemap
- Schema — JSON-LD parse / basic validation
- Performance signals — image dimensions, fonts (not lab Web Vitals)

```ts
import { runLiveDiagnostics } from "moneygap-diagnostics";

const { ok, result, error } = await runLiveDiagnostics("https://example.com");
```
