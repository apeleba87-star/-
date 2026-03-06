"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/tender-utils";
import { POSITION_STATUS_LABELS } from "@/lib/jobs/types";
import type { PositionStatus } from "@/lib/jobs/types";

export type PositionSummary = {
  id: string;
  categoryDisplay: string;
  required_count: number;
  filled_count: number;
  pay_amount: number;
  pay_unit: string;
  status: PositionStatus;
};

type Props = {
  id: string;
  title: string;
  status: string;
  region: string;
  district: string;
  work_date: string | null;
  positions: PositionSummary[];
};

const payUnitLabel: Record<string, string> = {
  day: "일당",
  half_day: "반당",
  hour: "시급",
};

export default function JobPostCard({
  id,
  title,
  status,
  region,
  district,
  work_date,
  positions,
}: Props) {
  const displayTitle = status === "closed" ? `마감)) ${title}` : title;
  const regionDisplay = district ? `${region} ${district}` : region;

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
      <Link href={`/jobs/${id}`} className="flex flex-1 flex-col">
        <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">{displayTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {regionDisplay}
          {work_date && <span className="ml-2">· {work_date}</span>}
        </p>
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {positions.map((pos) => (
            <li key={pos.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                {pos.categoryDisplay} {pos.required_count}명 / {formatMoney(pos.pay_amount)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  pos.status === "closed"
                    ? "bg-slate-200 text-slate-600"
                    : pos.status === "partial"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {POSITION_STATUS_LABELS[pos.status]}
              </span>
            </li>
          ))}
        </ul>
      </Link>
    </article>
  );
}
