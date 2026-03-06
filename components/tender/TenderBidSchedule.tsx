"use client";

import { Clock, Calendar, Bell } from "lucide-react";
import { formatDate, dday, ddayNumber } from "@/lib/tender-utils";

type Props = {
  bidNtceDt: string | null;
  bidClseDt: string | null;
  opengDt: string | null;
};

function ddayColorClass(clseDt: string | null): string {
  if (!clseDt) return "bg-slate-50 border-slate-100 text-slate-700";
  const n = ddayNumber(clseDt);
  if (n <= 0) return "border-red-200 bg-red-50 text-red-800";
  if (n <= 3) return "border-orange-200 bg-orange-50 text-orange-800";
  if (n <= 7) return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "bg-slate-50 border-slate-100 text-slate-700";
}

export default function TenderBidSchedule({ bidNtceDt, bidClseDt, opengDt }: Props) {
  const items = [
    {
      label: "공고 게시일",
      value: bidNtceDt,
      icon: Clock,
      dday: null,
      colorClass: "bg-slate-50 border-slate-100 text-slate-700",
    },
    {
      label: "입찰 마감일",
      value: bidClseDt,
      icon: Bell,
      dday: bidClseDt ? dday(bidClseDt) : null,
      colorClass: bidClseDt ? ddayColorClass(bidClseDt) : "bg-slate-50 border-slate-100 text-slate-700",
    },
    {
      label: "개찰일시",
      value: opengDt,
      icon: Calendar,
      dday: null,
      colorClass: "bg-slate-50 border-slate-100 text-slate-700",
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
        <Calendar className="h-5 w-5 text-slate-500" aria-hidden />
        일정
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map(({ label, value, icon: Icon, dday: d, colorClass }) => (
          <li
            key={label}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${colorClass}`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              {label}
            </span>
            <span className="text-right font-semibold">
              {value ? formatDate(value, { withTime: true }) : "—"}
              {d != null && <span className="ml-2 font-bold">({d})</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
