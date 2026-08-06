import { ImageResponse } from "next/og";
import { absoluteUrl } from "@/lib/seo";

export const runtime = "edge";
export const alt = "MoneyGap AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadBrandMark(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(absoluteUrl("/og-mark.png"));
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const mark = await loadBrandMark();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #0c1210 0%, #12201a 45%, #1a2e24 100%)",
          padding: "64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          {mark ? (
            <img
              src={mark}
              width={72}
              height={72}
              alt=""
              style={{ borderRadius: 16 }}
            />
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6ee7b7",
            }}
          >
            MoneyGap AI
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.12,
              color: "#f4f7f5",
              maxWidth: 980,
            }}
          >
            Find website revenue leaks growth teams miss — then close them with
            Fix Paths™.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#a7b5ad",
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Developer-friendly conversion tool and codebase growth audit —
            ranked Money Gaps™, not another static audit PDF.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
