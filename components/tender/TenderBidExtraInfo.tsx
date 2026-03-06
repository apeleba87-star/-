"use client";

import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";

type Props = {
  qualReqSummary: string | null;
  regionText: string;
  bidMethod: string;
  awardMethod: string;
  extraItems: { label: string; value: string }[];
};

export default function TenderBidExtraInfo({
  qualReqSummary,
  regionText,
  bidMethod,
  awardMethod,
  extraItems,
}: Props) {
  const [open, setOpen] = useState(false);

  const hasContent =
    qualReqSummary ||
    regionText !== "—" ||
    bidMethod !== "—" ||
    awardMethod !== "—" ||
    extraItems.length > 0;

  if (!hasContent) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-slate-800 transition-all duration-200 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <Info className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          추가 정보
          <span className="text-sm font-normal text-slate-500">(나라장터 원문성)</span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {qualReqSummary && (
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
              <h3 className="text-xs font-medium text-slate-500">참가자격</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{qualReqSummary}</p>
            </div>
          )}
          {regionText !== "—" && (
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
              <h3 className="text-xs font-medium text-slate-500">지역제한</h3>
              <p className="mt-1 text-sm text-slate-700">{regionText}</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {bidMethod !== "—" && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium text-slate-500">입찰방식</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{bidMethod}</dd>
              </div>
            )}
            {awardMethod !== "—" && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium text-slate-500">낙찰방법</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{awardMethod}</dd>
              </div>
            )}
          </div>
          {extraItems.length > 0 && (
            <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3">
              <h3 className="text-xs font-medium text-blue-700">특이사항</h3>
              <dl className="mt-2 space-y-1">
                {extraItems.map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="text-sm text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
