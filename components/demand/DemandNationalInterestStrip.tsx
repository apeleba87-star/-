import {
  DEMAND_NATIONAL_INTEREST_CURRENT_BADGE,
  DEMAND_NATIONAL_INTEREST_LABEL,
  formatNationalInterestBaselineCaption,
} from "@/lib/demand/copy";

type Props = {
  index: number;
  changePct?: number;
  searchYyyymm?: string | null;
};

export default function DemandNationalInterestStrip({
  index,
  changePct = 0,
  searchYyyymm = null,
}: Props) {
  const display = Math.round(index * 10) / 10;

  return (
    <section className="max-w-xs rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white px-5 py-4 ring-1 ring-teal-50">
      <div className="flex flex-col items-start gap-2">
        <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
          {DEMAND_NATIONAL_INTEREST_CURRENT_BADGE}
        </span>
        <p className="text-xs font-semibold tracking-wide text-teal-700">
          {DEMAND_NATIONAL_INTEREST_LABEL}
        </p>
        <p className="text-4xl font-black tabular-nums text-teal-900">{display}</p>
        <p className="text-left text-xs text-slate-500">
          {formatNationalInterestBaselineCaption(changePct, searchYyyymm)}
        </p>
      </div>
    </section>
  );
}
