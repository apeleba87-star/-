"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, Sparkles } from "lucide-react";

const glass = "bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg";

export default function DataInsightSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="mb-10"
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow">
        <BarChart3 className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">데이터 인사이트</h2>
      <p className="mt-0.5 text-sm text-slate-600">청소 단가 데이터 요약 · 구독 시 더 많은 인사이트 제공</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <motion.div
          className={`${glass} rounded-2xl p-4`}
          whileHover={{ scale: 1.03, boxShadow: "0 16px 40px -12px rgba(37,99,235,0.2)" }}
          style={{ borderColor: "rgba(37,99,235,0.2)" }}
        >
          <p className="text-sm text-slate-500">키즈카페 평균 단가</p>
          <p className="mt-1 text-xl font-bold text-blue-600">평당 4,200원</p>
        </motion.div>
        <motion.div
          className={`${glass} rounded-2xl p-4`}
          whileHover={{ scale: 1.03, boxShadow: "0 16px 40px -12px rgba(124,58,237,0.2)" }}
          style={{ borderColor: "rgba(124,58,237,0.2)" }}
        >
          <p className="text-sm text-slate-500">사무실 청소 평균</p>
          <p className="mt-1 text-xl font-bold text-purple-600">평당 3,200원</p>
        </motion.div>
      </div>

      <motion.div
        className="relative mt-4 overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-orange-50/80 p-5 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ boxShadow: "0 20px 40px -12px rgba(245,158,11,0.25)" }}
      >
        <span className="absolute right-3 top-3">
          <motion.span
            className="inline-flex text-amber-600"
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.span>
        </span>
        <span className="inline-block rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
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
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:from-amber-600 hover:to-orange-600 touch-manipulation"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          구독하기
        </Link>
      </motion.div>
    </motion.section>
  );
}
