import Image from "next/image";
import type { CSSProperties } from "react";

type Props = {
  src: string;
  alt: string;
  /** 히어로 그라데이션 위 · marginBottom 포함 */
  variant?: "hero" | "inline";
  style?: CSSProperties;
};

function canOptimize(src: string): boolean {
  if (src.startsWith("/") || src.startsWith("data:")) return src.startsWith("/");
  try {
    const host = new URL(src).hostname;
    return (
      host.includes("supabase.co") ||
      host.includes("pstatic.net") ||
      host.endsWith("cleanidex.co.kr")
    );
  } catch {
    return false;
  }
}

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
  const maxH = variant === "hero" ? 316 : 224;
  const imgStyle: CSSProperties = {
    width: "auto",
    height: "auto",
    maxWidth: "100%",
    maxHeight: maxH,
    objectFit: "contain",
    display: "block",
  };

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
      {canOptimize(src) ? (
        <Image
          src={src}
          alt={alt}
          width={800}
          height={800}
          priority={variant === "hero"}
          sizes="(max-width: 768px) 92vw, 640px"
          style={imgStyle}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={800}
          height={800}
          style={imgStyle}
          loading={variant === "hero" ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </div>
  );
}
