"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, Newspaper, MapPin } from "lucide-react";

const glass = "bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg";

export default function HeroSection({
  tenderRelatedCount,
  tenderTodayCount,
  newsCount,
  ugcCount,
}: {
  tenderRelatedCount: number;
  tenderTodayCount: number;
  newsCount: number;
  ugcCount: number;
}) {
  const cards = [
    {
      href: "/tenders?category=both",
      count: tenderRelatedCount,
      subCount: tenderTodayCount,
      label: "청소·방역·소독 입찰",
      subLabel: "오늘 공고",
      color: "#2563eb",
      Icon: TrendingUp,
    },
    {
      href: "/categories/industry",
      count: newsCount,
      subCount: undefined,
      label: "업계 소식",
      subLabel: undefined,
      color: "#7c3aed",
      Icon: Newspaper,
    },
    {
      href: "/ugc",
      count: ugcCount,
      subCount: undefined,
      label: "새 현장 공유",
      subLabel: undefined,
      color: "#0891b2",
      Icon: MapPin,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      <h1 className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">
        청소업 브리핑
      </h1>
      <p className="mt-1.5 text-sm text-slate-600 sm:mt-2 sm:text-base">오늘의 요약 정보를 한눈에 확인하세요.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3">
        {cards.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
          >
            <Link href={item.href} className="block touch-manipulation">
              <motion.div
                className={`${glass} flex min-h-[100px] flex-col justify-center rounded-2xl p-4 sm:min-h-0 sm:p-4`}
                whileHover={{ scale: 1.02, y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.span
                  className="mb-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: item.color }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <item.Icon className="h-5 w-5" />
                </motion.span>
                <p className="text-xl font-bold sm:text-2xl" style={{ color: item.color }}>
                  {item.count}건
                </p>
                <p className="mt-0.5 text-xs text-slate-600 sm:mt-1">{item.label}</p>
                {item.subLabel != null && item.subCount != null && (
                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                    {item.subLabel} {item.subCount}건
                  </p>
                )}
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
