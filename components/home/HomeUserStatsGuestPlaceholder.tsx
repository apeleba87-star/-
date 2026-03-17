"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, CalendarCheck } from "lucide-react";
import { homeDashboardCardClass } from "./home-section-styles";

/**
 * 비로그인 시 3행 카드(내 구인 현황, 내 지원·매칭) 영역을 같은 레이아웃으로 보여주고
 * "로그인 후 확인하세요" 안내로 채움.
 */
export default function HomeUserStatsGuestPlaceholder() {
  return (
    <section className="mb-8 grid gap-4 sm:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
      >
        <Link href="/login?next=/jobs/manage" className="block h-full">
          <div className={`${homeDashboardCardClass} flex h-full flex-col border-emerald-200 bg-emerald-50/50`}>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <ClipboardList className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-slate-900">내 구인 현황</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">30일 집계 기준</p>
            <p className="mt-2 flex-1 text-sm text-slate-600">로그인 후 확인하세요.</p>
            <span className="mt-3 inline-flex items-center text-sm font-medium text-emerald-700">로그인하기</span>
          </div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.4 }}
      >
        <Link href="/login?next=/jobs" className="block h-full">
          <div className={`${homeDashboardCardClass} flex h-full flex-col border-blue-200 bg-blue-50/50`}>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-slate-900">내 지원·매칭</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">30일 집계 기준</p>
            <p className="mt-2 flex-1 text-sm text-slate-600">로그인 후 확인하세요.</p>
            <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-700">로그인하기</span>
          </div>
        </Link>
      </motion.div>
    </section>
  );
}
