"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const CURL = `curl -X POST https://moneygap-ai.com/api/v1/analyze \\
  -H "Authorization: Bearer $MG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"website_url":"https://example.com"}'`;

export function ResourcesPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Quickstart</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            Auth:{" "}
            <code className="text-fg">Authorization: Bearer mg_test_…</code> or{" "}
            <code className="text-fg">X-API-Key</code>
          </p>
          <pre className="overflow-x-auto rounded-xl border border-border bg-bg px-3 py-3 font-mono text-xs text-fg">
            {CURL}
          </pre>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code>POST /api/v1/analyze</code> — queue analysis
            </li>
            <li>
              <code>GET /api/v1/analyze/{"{id}"}/status</code>
            </li>
            <li>
              <code>GET /api/v1/websites/{"{id}"}/score</code>
            </li>
            <li>
              <code>GET /api/v1/websites/{"{id}"}/opportunities</code>
            </li>
            <li>
              <code>GET /api/v1/reports/{"{id}"}</code>
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Docs & specs</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          <Button href="/docs/moneygap-api" size="sm">
            API docs
          </Button>
          <Button href="/openapi/moneygap-v1.json" size="sm" variant="secondary">
            OpenAPI JSON
          </Button>
          <Button href="/api/v1/openapi" size="sm" variant="secondary">
            OpenAPI (API route)
          </Button>
          <Button href="/docs/programmatic-fix-paths" size="sm" variant="ghost">
            Programmatic Fix Paths™
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">SDKs & CLI</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            <span className="font-medium text-fg">JavaScript</span> —{" "}
            <code className="text-fg">@moneygap/sdk</code> thin REST client
            (<code>analyze</code> sends <code>website_url</code>).
          </p>
          <p>
            <span className="font-medium text-fg">Python</span> —{" "}
            <code className="text-fg">moneygap</code> package with the same
            surface.
          </p>
          <p>
            <span className="font-medium text-fg">CLI</span> —{" "}
            <code className="text-fg">npx moneygap-scan https://example.com</code>
            {" · "}
            <Link href="/cli" className="text-accent hover:underline">
              CLI docs
            </Link>
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button href="/guides" size="sm" variant="secondary">
              Guides
            </Button>
            <Button href="/dashboard/integrations" size="sm" variant="ghost">
              Integration Hub
            </Button>
            <Button href="/dashboard/settings" size="sm" variant="ghost">
              ← Settings
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
