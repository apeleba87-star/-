import type { CSSProperties } from "react";
import { BEFORE_AFTER_FRAME_ASPECT } from "@/lib/knowledge-hub/media/product-before-after-types";

const BORDER = "#e8edf3";
const TEXT = "#1a2a3a";
const TEXT_SEC = "#6b7a8d";
const BEFORE_ACCENT = "#64748b";
const AFTER_ACCENT = "#00b894";

export type BeforeAfterCompareProps = {
  beforeUrl?: string | null;
  afterUrl?: string | null;
  beforeAlt?: string;
  afterAlt?: string;
  beforeCaption?: string;
  afterCaption?: string;
  beforeFocalX?: number;
  beforeFocalY?: number;
  afterFocalX?: number;
  afterFocalY?: number;
  compact?: boolean;
  style?: CSSProperties;
};

function Panel({
  label,
  accent,
  url,
  alt,
  caption,
  focalX = 50,
  focalY = 50,
  compact,
}: {
  label: string;
  accent: string;
  url?: string | null;
  alt: string;
  caption?: string;
  focalX?: number;
  focalY?: number;
  compact?: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          fontSize: compact ? 12 : 13,
          fontWeight: 800,
          color: accent,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          background: "#f1f5f9",
          overflow: "hidden",
          aspectRatio: BEFORE_AFTER_FRAME_ASPECT,
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${focalX}% ${focalY}%`,
              display: "block",
            }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: TEXT_SEC,
            }}
          >
            —
          </div>
        )}
      </div>
      {caption ? (
        <p
          style={{
            margin: "8px 0 0",
            textAlign: "center",
            fontSize: compact ? 12 : 13,
            fontWeight: 600,
            color: TEXT,
            lineHeight: 1.4,
            wordBreak: "keep-all",
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 사용 전 / 사용 후 좌우 비교 — 고정 프레임 + cover
 */
export default function BeforeAfterCompare({
  beforeUrl,
  afterUrl,
  beforeAlt = "사용 전",
  afterAlt = "사용 후",
  beforeCaption,
  afterCaption,
  beforeFocalX = 50,
  beforeFocalY = 50,
  afterFocalX = 50,
  afterFocalY = 50,
  compact = false,
  style,
}: BeforeAfterCompareProps) {
  if (!beforeUrl && !afterUrl) return null;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${BORDER}`,
        background: "#fff",
        padding: compact ? 12 : 14,
        ...style,
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: compact ? 13 : 14,
          fontWeight: 800,
          color: TEXT,
        }}
      >
        사용 전 · 후
      </p>
      <div
        style={{
          display: "flex",
          gap: compact ? 8 : 10,
          alignItems: "flex-start",
        }}
      >
        <Panel
          label="사용 전"
          accent={BEFORE_ACCENT}
          url={beforeUrl}
          alt={beforeAlt}
          caption={beforeCaption}
          focalX={beforeFocalX}
          focalY={beforeFocalY}
          compact={compact}
        />
        <div
          aria-hidden
          style={{
            width: 1,
            alignSelf: "stretch",
            background: BORDER,
            flexShrink: 0,
            marginTop: 28,
          }}
        />
        <Panel
          label="사용 후"
          accent={AFTER_ACCENT}
          url={afterUrl}
          alt={afterAlt}
          caption={afterCaption}
          focalX={afterFocalX}
          focalY={afterFocalY}
          compact={compact}
        />
      </div>
    </div>
  );
}

export function BeforeAfterCompareComplete(props: BeforeAfterCompareProps) {
  if (!props.beforeUrl || !props.afterUrl) return null;
  return <BeforeAfterCompare {...props} />;
}
