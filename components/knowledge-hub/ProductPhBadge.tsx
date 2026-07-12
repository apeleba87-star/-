import { parseProductPh } from "@/lib/knowledge-hub/ph-scale";

type Props = {
  phApprox: string | null | undefined;
  /** sm: 목록, md: 제목 옆 균형, lg: 단독 강조 */
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** 제품명 옆 pH 배지 — 스케일 색 + 약산성/약알칼리 등 */
export default function ProductPhBadge({ phApprox, size = "md", className }: Props) {
  const info = parseProductPh(phApprox);
  if (!info) return null;

  const pad =
    size === "lg"
      ? "px-3.5 py-2 text-lg"
      : size === "sm"
        ? "px-2 py-0.5 text-xs"
        : "px-3 py-1.5 text-base";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center gap-x-1.5 rounded-xl font-bold leading-none whitespace-nowrap ${pad} ${className ?? ""}`}
      style={{ backgroundColor: info.color, color: info.textColor }}
      title={`원액 기준 약 pH ${info.valueLabel} (${info.natureLabel})`}
    >
      <span>pH {info.valueLabel}</span>
      <span aria-hidden className="opacity-70">
        ·
      </span>
      <span>{info.natureLabel}</span>
    </span>
  );
}
