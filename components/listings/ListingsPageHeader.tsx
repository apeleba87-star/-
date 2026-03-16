"use client";

import { motion } from "framer-motion";
import { PenSquare } from "lucide-react";
import AuthRequiredCta from "@/components/AuthRequiredCta";

type Props = {
  isLoggedIn: boolean;
};

export default function ListingsPageHeader({ isLoggedIn }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-700 bg-clip-text text-transparent"
        >
          현장 거래
        </motion.h1>
        <p className="mt-2 text-slate-600">
          현장의 평균 단가와 비교해 등급을 확인할 수 있습니다. (정기/일회 소개, 매매, 도급)
        </p>
      </div>
      <AuthRequiredCta
        isLoggedIn={isLoggedIn}
        href="/listings/new"
        message="로그인 후에만 현장 거래 등록이 가능합니다."
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      >
        <PenSquare className="h-4 w-4" />
        쓰기
      </AuthRequiredCta>
    </div>
  );
}
