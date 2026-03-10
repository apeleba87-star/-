"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { applyToPosition } from "@/app/jobs/[id]/actions";

type Props = {
  positionId: string;
  jobPostId: string;
  disabled?: boolean;
  alreadyApplied?: boolean;
};

export default function ApplyButton({ positionId, jobPostId, disabled, alreadyApplied }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setLoading(true);
    setError(null);
    const result = await applyToPosition(positionId, jobPostId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "지원 실패");
      return;
    }
    window.location.reload();
  }

  if (alreadyApplied) {
    return (
      <div className="border-t border-slate-200/80 pt-4">
        <button
          type="button"
          disabled
          aria-label="지원 완료"
          className="min-h-[48px] w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 opacity-80 sm:w-auto sm:min-w-[140px]"
        >
          지원완료
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200/80 pt-4">
      <motion.button
        type="button"
        disabled={disabled || loading}
        onClick={handleApply}
        className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 sm:w-auto sm:min-w-[140px]"
        whileHover={disabled || loading ? {} : { scale: 1.02 }}
        whileTap={disabled || loading ? {} : { scale: 0.98 }}
      >
        {loading ? "지원 중…" : "지원하기"}
      </motion.button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
