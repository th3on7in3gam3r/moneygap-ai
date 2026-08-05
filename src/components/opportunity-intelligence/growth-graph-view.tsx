"use client";

import { useMemo, useState } from "react";

type GraphNode = {
  id: string;
  nodeType: string;
  label: string;
  slug: string;
  meta?: Record<string, unknown> | null;
};

type GraphEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  weight: number;
};

const TYPE_COLORS: Record<string, string> = {
  website: "#0d9488",
  page: "#64748b",
  topic: "#2563eb",
  keyword: "#38bdf8",
  entity: "#8b5cf6",
  question: "#f59e0b",
  intent: "#94a3b8",
  product: "#16a34a",
  service: "#15803d",
  competitor: "#dc2626",
  revenue_opportunity: "#ea580c",
  moneygap_score: "#0f766e",
  ai_readiness: "#7c3aed",
  schema_gap: "#db2777",
  roadmap_item: "#ca8a04",
};

function layoutNodes(nodes: GraphNode[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const rings = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = rings.get(n.nodeType) ?? [];
    list.push(n);
    rings.set(n.nodeType, list);
  }
  const types = [...rings.keys()];
  const positions = new Map<string, { x: number; y: number }>();

  const website = nodes.find((n) => n.nodeType === "website");
  if (website) positions.set(website.id, { x: cx, y: cy });

  let ring = 0;
  for (const type of types) {
    if (type === "website") continue;
    ring += 1;
    const group = rings.get(type) ?? [];
    const radius = 70 + ring * 55;
    group.forEach((n, i) => {
      const angle = (i / Math.max(1, group.length)) * Math.PI * 2 - Math.PI / 2;
      positions.set(n.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });
  }
  return positions;
}

export function GrowthGraphView({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const width = 720;
  const height = 480;
  const positions = useMemo(
    () => layoutNodes(nodes.slice(0, 80), width, height),
    [nodes],
  );

  const neighborIds = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const e of edges) {
      if (e.fromNodeId === focusId) set.add(e.toNodeId);
      if (e.toNodeId === focusId) set.add(e.fromNodeId);
    }
    return set;
  }, [focusId, edges]);

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Growth Graph™ will appear after the next intelligence scan completes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full rounded-xl border border-border bg-bg"
        role="img"
        aria-label="Growth Graph visualization"
      >
        {edges.map((e) => {
          const a = positions.get(e.fromNodeId);
          const b = positions.get(e.toNodeId);
          if (!a || !b) return null;
          const dim =
            neighborIds &&
            !neighborIds.has(e.fromNodeId) &&
            !neighborIds.has(e.toNodeId);
          return (
            <line
              key={e.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              className={dim ? "text-border opacity-20" : "text-border opacity-70"}
              strokeWidth={Math.min(3, 0.5 + (e.weight ?? 1) * 0.25)}
            />
          );
        })}
        {nodes.slice(0, 80).map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const isGap =
            n.nodeType === "revenue_opportunity" ||
            Boolean(n.meta && (n.meta as { gap?: boolean }).gap);
          const dim = neighborIds && !neighborIds.has(n.id);
          const fill = TYPE_COLORS[n.nodeType] ?? "#64748b";
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              className="cursor-pointer"
              onClick={() => setFocusId((id) => (id === n.id ? null : n.id))}
              opacity={dim ? 0.25 : 1}
            >
              <circle
                r={isGap ? 10 : n.nodeType === "website" ? 14 : 7}
                fill={fill}
                stroke={focusId === n.id ? "#fff" : "transparent"}
                strokeWidth={2}
              />
              <title>{`${n.nodeType}: ${n.label}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2 text-[11px] text-fg-muted">
        {Object.entries(TYPE_COLORS)
          .slice(0, 10)
          .map(([type, color]) => (
            <span key={type} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              {type.replace(/_/g, " ")}
            </span>
          ))}
      </div>
      {focusId && (
        <p className="text-xs text-fg-muted">
          Focused:{" "}
          <span className="text-fg">
            {nodes.find((n) => n.id === focusId)?.label ?? focusId}
          </span>{" "}
          — click again to clear.
        </p>
      )}
    </div>
  );
}
