"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ChevronRight, Lock } from "lucide-react";
import { formatMoneyMan, getBaseAmtFromRaw, ddayNumber } from "@/lib/tender-utils";
import {
  homeCardClass,
  homeFooterBtnPrimaryClass,
  homeSectionIconGradientBox,
  homeSectionSpacing,
  homeSurfaceCardClass,
  homeSurfaceCardInnerClass,
} from "./home-section-styles";

function getBaseAmount(t: Tender): number | null {
  if (t.base_amt != null) return Number(t.base_amt);
  return getBaseAmtFromRaw(t.raw) ?? null;
}

function getDaysStyle(days: number): string {
  if (days <= 3) return "bg-red-50 text-red-700 border-red-200";
  if (days <= 7) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-violet-50 text-violet-700 border-violet-200";
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

type IndustryBreakdownItem = { industry_code: string; industry_name: string; count: number };

type Props = {
  tenders: Tender[];
  relatedCount: number;
  todayCount: number;
  industryBreakdown?: IndustryBreakdownItem[];
  /** 비로그인 시 건수·목록 블라인드 */
  isLoggedIn?: boolean;
  /** 앵커 링크용 */
  sectionId?: string;
};

export default function TenderSection({
  tenders,
  relatedCount,
  todayCount,
  industryBreakdown = [],
  isLoggedIn = true,
  sectionId = "tenders",
}: Props) {
  const blind = !isLoggedIn;
  const industryLineItems = blind ? [] : industryBreakdown.filter((i) => i.count > 0);

  return (
    <motion.section
      id={sectionId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={`${homeSectionSpacing} scroll-mt-20 sm:scroll-mt-24`}
    >
      <div className={`${homeSurfaceCardClass} overflow-hidden`}>
        <div className={`${homeSurfaceCardInnerClass} px-6 py-8 sm:px-8 sm:py-10`}>
          <header className="mb-6 text-center sm:mb-8">
            <div className={`${homeSectionIconGradientBox} mx-auto`}>
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">청소·방역·소독 입찰 공고</h2>
            <p className="mt-0.5 text-xs text-zinc-600">
              등록 업종 기준{" "}
              {blind ? (
                "—건"
              ) : (
                <>
                  <span className="font-bold text-zinc-900">{relatedCount}건</span> 접수 중
                  {todayCount > 0 ? (
                    <>
                      {" "}
                      · 오늘 <span className="font-bold text-violet-600">{todayCount}건</span> 신규
                    </>
                  ) : null}
                </>
              )}
            </p>
          </header>

          {industryLineItems.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-center text-sm">
              <span className="text-zinc-500">업종별:</span>
              {industryLineItems.map((item, idx) => (
                <span key={item.industry_code}>
                  {idx > 0 && <span className="text-zinc-300">·</span>}
                  <Link
                    href={`/tenders?industry=${encodeURIComponent(item.industry_code)}`}
                    className="ml-1 font-medium text-zinc-700 underline-offset-2 hover:text-violet-600 hover:underline"
                  >
                    {item.industry_name} {item.count}건
                  </Link>
                </span>
              ))}
            </div>
          )}

          {tenders.length === 0 ? (
            <div className={`${homeCardClass} flex flex-col items-center justify-center p-8`}>
              <FileText className="h-12 w-12 text-zinc-300" />
              <p className="mt-3 text-sm text-zinc-500">
                {blind ? "로그인 후 접수 중인 입찰 공고를 확인하세요." : "현재 접수 중인 청소·방역·소독 입찰 공고가 없습니다."}
              </p>
              {blind && (
                <Link
                  href="/login?next=/tenders"
                  className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-blue-500 hover:via-violet-500 hover:to-purple-500"
                >
                  로그인하기
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {tenders.map((t) => {
                const baseAmt = getBaseAmount(t);
                const days = ddayNumber(t.bid_clse_dt);
                return (
                  <li key={t.id}>
                    <Link
                      href={blind ? `/login?next=${encodeURIComponent(`/tenders/${t.id}`)}` : `/tenders/${t.id}`}
                      className="group block rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-zinc-950/[0.02] transition-all hover:border-violet-200/90 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 flex-1 line-clamp-2 text-base font-semibold text-zinc-900 group-hover:text-violet-600">
                            {t.bid_ntce_nm || "(제목 없음)"}
                          </h3>
                          <span
                            className={`shrink-0 rounded-lg border px-2.5 py-1 text-sm font-bold ${getDaysStyle(days)}`}
                          >
                            {getDaysText(days)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 line-clamp-1">
                          {t.ntce_instt_nm || "—"}
                          {t.bsns_dstr_nm ? ` · ${t.bsns_dstr_nm}` : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500">
                            기초금액
                          </span>
                          {blind ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200/60 transition-colors group-hover:bg-zinc-200/80 group-hover:ring-zinc-300/70">
                              <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={2} />
                              로그인 후 확인
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-zinc-800">
                              {baseAmt != null ? formatMoneyMan(baseAmt) : "—"}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-zinc-400 group-hover:text-violet-500">
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

          <Link href="/tenders" className={`${homeFooterBtnPrimaryClass} block`}>
            전체 공고 보기
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
