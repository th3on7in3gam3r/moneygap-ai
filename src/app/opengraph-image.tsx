import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MoneyGap AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0c1210 0%, #12201a 45%, #1a2e24 100%)",
          padding: "64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#f4f7f5",
              maxWidth: 900,
            }}
          >
            Find the revenue you&apos;re leaving behind
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#a7b5ad",
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            AI-powered Growth Operating System™ for Money Gaps™, Fix Paths™, and measurable growth.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
