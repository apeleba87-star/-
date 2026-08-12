import type { CSSProperties } from "react";

type Props = {
  src: string;
  alt: string;
  /** 히어로 그라데이션 위 · marginBottom 포함 */
  variant?: "hero" | "inline";
  style?: CSSProperties;
};

/**
 * 지식 허브 대표 이미지 — 비율 무관 전체 노출 (contain).
 * 세로 제품병·가로 배너 모두 잘리지 않게.
 */
export default function KnowledgeHeroImage({
  src,
  alt,
  variant = "hero",
  style,
}: Props) {
  return (
    <div
      style={{
        ...(variant === "hero"
          ? {
              marginBottom: 14,
              borderRadius: 14,
              background: "rgba(255,255,255,0.92)",
              padding: 12,
              minHeight: 100,
              maxHeight: 340,
            }
          : {
              borderRadius: 12,
              background: "#f8fafc",
              padding: 8,
              minHeight: 80,
              maxHeight: 240,
            }),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={800}
        height={800}
        style={{
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: variant === "hero" ? 316 : 224,
          objectFit: "contain",
          display: "block",
        }}
        loading={variant === "hero" ? "eager" : "lazy"}
      />
    </div>
  );
}
