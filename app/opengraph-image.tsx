import { ImageResponse } from "next/og";
import { defaultTitle } from "@/lib/seo";

export const runtime = "edge";
export const alt = defaultTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #0f766e 0%, #059669 42%, #0e7490 100%)",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.15,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          클린아이덱스
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            fontWeight: 600,
            opacity: 0.95,
            maxWidth: 900,
            lineHeight: 1.35,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          현장 작업 증빙 · 입찰 · 구인 · 데이터랩
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 24,
            fontWeight: 500,
            opacity: 0.88,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          사진 · 체크리스트 · 고객 확인 · 전자서명
        </div>
      </div>
    ),
    { ...size },
  );
}
