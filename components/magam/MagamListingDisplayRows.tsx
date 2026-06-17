import type { MagamDisplayRow } from "@/lib/magam/format-listing";
import { cn } from "@/lib/utils";

type Props = {
  rows: MagamDisplayRow[];
  compact?: boolean;
};

/** 카카오 공유와 동일한 라벨·순서로 필드 표시 */
export default function MagamListingDisplayRows({ rows, compact = false }: Props) {
  if (rows.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-[5.75rem_1fr] items-start gap-x-3",
        compact ? "mt-2 gap-y-1" : "mt-4 gap-y-2.5"
      )}
    >
      {rows.map((row) => (
        <Row key={`${row.label}-${row.detailAnchor ?? row.value.slice(0, 24)}`} row={row} compact={compact} />
      ))}
    </dl>
  );
}

function Row({ row, compact }: { row: MagamDisplayRow; compact: boolean }) {
  return (
    <>
      <dt
        className={cn(
          "font-medium text-slate-500",
          compact ? "text-xs leading-5" : "text-sm leading-relaxed"
        )}
      >
        {row.label}
      </dt>
      <dd
        id={row.detailAnchor && row.label === "상세 설명" ? row.detailAnchor : undefined}
        className={cn(
          "min-w-0 whitespace-pre-wrap text-slate-800",
          compact ? "line-clamp-3 text-xs leading-5" : "text-[15px] leading-relaxed"
        )}
      >
        {row.value}
      </dd>
    </>
  );
}
