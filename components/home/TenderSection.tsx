"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ChevronRight } from "lucide-react";
import { formatMoneyMan, getBaseAmtFromRaw, ddayNumber } from "@/lib/tender-utils";
import {
  homeCardClass,
  homeFooterBtnClass,
  homeSectionIconBox,
  homeSectionSpacing,
} from "./home-section-styles";

function getBaseAmount(t: Tender): number | null {
  if (t.base_amt != null) return Number(t.base_amt);
  return getBaseAmtFromRaw(t.raw) ?? null;
}

function getDaysStyle(days: number): string {
  if (days <= 3) return "bg-red-50 text-red-700 border-red-200";
  if (days <= 7) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function getDaysText(days: number): string {
  if (days < 0) return "마감";
  if (days === 0) return "D-Day";
  return `D-${days}`;
}

type Tender = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  bsns_dstr_nm: string | null;
  base_amt?: number | null;
  raw?: unknown;
};

type Props = { tenders: Tender[]; relatedCount: number; todayCount: number };

export default function TenderSection({ tenders, relatedCount, todayCount }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={homeSectionSpacing}
    >
      <div className={`${homeSectionIconBox} bg-blue-500`}>
        <FileText className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">청소·방역·소독 입찰</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        관련건수 {relatedCount}건 · 오늘 공고 {todayCount}건
      </p>

      {tenders.length === 0 ? (
        <div className={`${homeCardClass} mt-4 flex flex-col items-center justify-center p-8`}>
          <FileText className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">현재 접수 중인 청소·방역·소독 입찰 공고가 없습니다.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {tenders.map((t) => {
            const baseAmt = getBaseAmount(t);
            const days = ddayNumber(t.bid_clse_dt);
            return (
              <li key={t.id}>
                <Link
                  href={`/tenders/${t.id}`}
                  className="group block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-blue-600">
                        {t.bid_ntce_nm || "(제목 없음)"}
                      </h3>
                      <span
                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-sm font-bold ${getDaysStyle(days)}`}
                      >
                        {getDaysText(days)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-1">
                      {t.ntce_instt_nm || "—"}
                      {t.bsns_dstr_nm ? ` · ${t.bsns_dstr_nm}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                        기초금액
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {baseAmt != null ? formatMoneyMan(baseAmt) : "—"}
                      </span>
                      <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-slate-400 group-hover:text-blue-500">
                        상세보기
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/tenders?category=both" className={`${homeFooterBtnClass} block`}>
        전체 공고 보기
      </Link>
    </motion.section>
  );
}
