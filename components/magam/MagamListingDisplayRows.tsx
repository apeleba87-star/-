import type { MagamDisplayRow } from "@/lib/magam/format-listing";

type Props = {
  rows: MagamDisplayRow[];
  compact?: boolean;
};

/** 카카오 공유와 동일한 라벨·순서로 필드 표시 */
export default function MagamListingDisplayRows({ rows, compact = false }: Props) {
  if (rows.length === 0) return null;

  return (
    <dl className={compact ? "mt-2 space-y-1" : "mt-4 space-y-2"}>
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2 text-sm">
          <dt className="shrink-0 font-medium text-slate-500">{row.label}</dt>
          <dd
            className={`whitespace-pre-wrap text-slate-800 ${
              compact ? "line-clamp-3" : "text-[15px] leading-relaxed"
            }`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
