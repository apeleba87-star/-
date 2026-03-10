"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/tender-utils";
import { POSITION_STATUS_LABELS } from "@/lib/jobs/types";
import type { PositionStatus } from "@/lib/jobs/types";
import { glassCard } from "@/lib/ui-styles";

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
  /** 구인글 작성자 닉네임(표시명) */
  ownerNickname?: string;
  /** 해당 구인글 총 지원자 수 (목록용) */
  applicationCount?: number;
  /** 내가 지원한 글일 때 내 지원 상태 라벨 (예: 지원함, 확정됨) */
  myStatusLabel?: string;
  /** 현재 사용자가 구인글 작성자인지 (카드에 "내 글" 표시) */
  isOwner?: boolean;
  /** 급구 뱃지: 오늘/내일 작업일 */
  urgentLabel?: "today" | "tomorrow";
  positions: PositionSummary[];
  index?: number;
};

const payUnitLabel: Record<string, string> = {
  day: "일당",
  half_day: "반당",
  hour: "시급",
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  applied: "지원함",
  reviewing: "검토 중",
  accepted: "확정됨",
  rejected: "거절됨",
  cancelled: "취소함",
};

export default function JobPostCard({
  id,
  title,
  status,
  region,
  district,
  work_date,
  ownerNickname,
  applicationCount,
  myStatusLabel,
  isOwner,
  urgentLabel,
  positions,
  index = 0,
}: Props) {
  const displayTitle = status === "closed" ? `(마감) ${title}` : title;
  const regionDisplay = district ? `${region} ${district}` : region;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.35 }}
    >
      <Link href={`/jobs/${id}`} className="block touch-manipulation">
        <motion.article
          className={`${glassCard} flex min-h-[120px] flex-col justify-center p-5 transition-colors hover:border-blue-200/60`}
          whileHover={{ scale: 1.01, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)" }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900">
                {displayTitle}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                <span className="font-medium text-slate-600">{regionDisplay}</span>
                {work_date && (
                  <span className="ml-2 text-slate-500">· 작업일 {work_date}</span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                <span className="text-slate-400">
                  구인자 <span className="font-medium text-slate-500">{ownerNickname || "—"}</span>
                </span>
                {applicationCount != null && applicationCount > 0 && (
                  <span className="text-slate-500">지원 {applicationCount}명</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {urgentLabel === "today" && (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">
                  🔥 오늘 현장
                </span>
              )}
              {urgentLabel === "tomorrow" && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                  🔥 내일 현장
                </span>
              )}
              {status === "closed" && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                  마감
                </span>
              )}
              {isOwner && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  내 글
                </span>
              )}
              {myStatusLabel && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                  {myStatusLabel}
                  {applicationCount != null && applicationCount > 0 && ` · ${applicationCount}명 지원`}
                </span>
              )}
            </div>
          </div>
          <ul className="mt-4 space-y-2 border-t border-slate-200/80 pt-4">
            {positions.map((pos) => (
              <li
                key={pos.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-slate-700">
                  <span className="font-medium text-slate-800">{pos.categoryDisplay}</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span>{pos.required_count}명</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(pos.pay_amount)}
                  </span>
                  <span className="ml-0.5 text-slate-500">{payUnitLabel[pos.pay_unit] ?? pos.pay_unit}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
        </motion.article>
      </Link>
    </motion.li>
  );
}
