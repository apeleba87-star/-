"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { applyToPosition } from "@/app/jobs/[id]/actions";
import ApplyProfileModal from "./ApplyProfileModal";

type InitialWorker = {
  nickname: string;
  birth_date: string | null;
  gender: string | null;
  contact_phone: string | null;
};

type Props = {
  positionId: string;
  jobPostId: string;
  disabled?: boolean;
  alreadyApplied?: boolean;
  workerProfileComplete: boolean;
  initialWorker: InitialWorker;
};

export default function ApplySection({
  positionId,
  jobPostId,
  disabled,
  alreadyApplied,
  workerProfileComplete,
  initialWorker,
}: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApplyClick() {
    setError(null);
    if (workerProfileComplete) {
      setLoading(true);
      const result = await applyToPosition(positionId, jobPostId);
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "지원 실패");
        return;
      }
      setJustApplied(true);
    } else {
      setModalOpen(true);
    }
  }

  function handleModalSuccess() {
    setModalOpen(false);
    setJustApplied(true);
    router.refresh();
  }

  const showCompleted = alreadyApplied || justApplied;

  if (showCompleted) {
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
    <>
      <div className="border-t border-slate-200/80 pt-4">
        <motion.button
          type="button"
          disabled={disabled || loading}
          onClick={handleApplyClick}
          className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 sm:w-auto sm:min-w-[140px] inline-flex items-center justify-center gap-2"
          whileHover={disabled || loading ? {} : { scale: 1.02 }}
          whileTap={disabled || loading ? {} : { scale: 0.98 }}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              <span>지원중</span>
            </>
          ) : (
            "지원하기"
          )}
        </motion.button>
        {!workerProfileComplete && (
          <p className="mt-2 text-xs text-slate-500">
            지원하기를 누르면 이름·생년월일·성별·휴대폰을 입력하고, 한 번만 입력하면 마이페이지에 저장됩니다.
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
      {modalOpen && (
        <ApplyProfileModal
          initialWorker={initialWorker}
          positionId={positionId}
          jobPostId={jobPostId}
          onSuccess={handleModalSuccess}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
