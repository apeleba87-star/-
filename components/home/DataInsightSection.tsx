"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, Sparkles } from "lucide-react";
import {
  homeCardClass,
  homeFooterBtnClass,
  homeSectionIconBox,
  homeSectionSpacing,
} from "./home-section-styles";

export default function DataInsightSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={homeSectionSpacing}
    >
      <div className={`${homeSectionIconBox} bg-amber-500`}>
        <BarChart3 className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">데이터 인사이트</h2>
      <p className="mt-0.5 text-xs text-slate-500">청소 단가 요약 · 구독 시 더 많은 인사이트 제공</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`${homeCardClass} border-blue-200/60`}>
          <p className="text-sm text-slate-500">키즈카페 평균 단가</p>
          <p className="mt-1 text-xl font-bold text-blue-600">평당 4,200원</p>
        </div>
        <div className={`${homeCardClass} border-violet-200/60`}>
          <p className="text-sm text-slate-500">사무실 청소 평균</p>
          <p className="mt-1 text-xl font-bold text-violet-600">평당 3,200원</p>
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/80 p-5">
        <span className="absolute right-3 top-3 text-amber-500">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
          PREMIUM
        </span>
        <p className="mt-2 text-sm font-semibold text-amber-900">구독 시 확인 가능</p>
        <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
            A급 현장 목록
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
            지역별 단가
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
            평균 계약 금액
          </li>
        </ul>
        <Link
          href="/subscribe"
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          구독하기
        </Link>
      </div>

      <Link href="/subscribe" className={`${homeFooterBtnClass} mt-4 block`}>
        구독·인사이트 더 보기
      </Link>
    </motion.section>
  );
}
