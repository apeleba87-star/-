import { DEMAND_DUMMY_DATA_BADGE } from "@/lib/demand/copy";

/** 해당 지표만 더미·대체 데이터일 때 표시 */
export default function DemandDummyBadge() {
  return (
    <span className="ml-1 rounded bg-slate-100 px-1 py-px text-[9px] font-semibold text-slate-500">
      {DEMAND_DUMMY_DATA_BADGE}
    </span>
  );
}
