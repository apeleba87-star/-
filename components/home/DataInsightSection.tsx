"use client";

import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, Sparkles } from "lucide-react";
import {
  homeCardClass,
  homeSectionIconGradientBox,
  homeSectionSpacing,
  homeSurfaceCardClass,
  homeSurfaceCardInnerClass,
} from "./home-section-styles";

const metricGradientClass =
  "mt-1 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent";

type Props = { sectionId?: string };

export default function DataInsightSection({ sectionId = "insights" }: Props) {
  return (
    <motion.section
      id={sectionId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={`${homeSectionSpacing} scroll-mt-20 sm:scroll-mt-24`}
    >
      <div className={`${homeSurfaceCardClass} overflow-hidden`}>
        <div className={`${homeSurfaceCardInnerClass} px-6 py-8 sm:px-8 sm:py-10`}>
          <header className="mb-6 text-center sm:mb-8">
            <div className={`${homeSectionIconGradientBox} mx-auto`}>
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">데이터 인사이트</h2>
            <p className="mt-0.5 text-xs text-zinc-500">청소 단가 요약 · 출시 예정 (구독 시 더 많은 인사이트 제공)</p>
          </header>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className={`${homeCardClass} border-zinc-200/80 opacity-95`}>
              <p className="text-sm text-zinc-500">사무실 청소 평균 단가</p>
              <p className={metricGradientClass}>평당 출시 예정</p>
            </div>
            <div className={`${homeCardClass} border-zinc-200/80 opacity-95`}>
              <p className="text-sm text-zinc-500">계단청소 평균 단가</p>
              <p className={metricGradientClass}>평당 출시 예정</p>
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm ring-1 ring-zinc-950/[0.02]">
            <span className="absolute right-3 top-3 text-violet-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
              출시 예정
            </span>
            <p className="mt-2 text-sm font-semibold text-zinc-800">준비 중입니다</p>
            <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />
                A급 현장 목록
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />
                지역별 단가
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />
                평균 계약 금액
              </li>
            </ul>
            <button
              type="button"
              disabled
              className="mt-4 inline-flex min-h-[48px] cursor-not-allowed items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-400"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-zinc-400" />
              출시 예정
            </button>
          </div>

          <p className="mt-6 block py-2 text-center text-sm text-zinc-500">데이터 인사이트는 준비 중입니다.</p>
        </div>
      </div>
    </motion.section>
  );
}
