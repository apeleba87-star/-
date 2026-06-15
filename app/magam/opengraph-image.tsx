import { ImageResponse } from "next/og";

import { MAGAM_APP_HIGHLIGHTS, MAGAM_APP_NAME, MAGAM_APP_TAGLINE } from "@/lib/magam/brand";
import { MAGAM_OG_ALT } from "@/lib/magam/metadata";

export const runtime = "edge";
export const alt = MAGAM_OG_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function MagamOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #141824 0%, #1f2433 48%, #2a3142 100%)",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {MAGAM_APP_NAME}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 36,
            fontWeight: 600,
            opacity: 0.95,
            maxWidth: 960,
            lineHeight: 1.35,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {MAGAM_APP_TAGLINE}
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: 26,
            fontWeight: 500,
            opacity: 0.88,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {MAGAM_APP_HIGHLIGHTS.map((line) => (
            <div key={line}>· {line}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
