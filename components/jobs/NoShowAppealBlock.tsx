"use client";

import { useState } from "react";
import { submitNoShowAppeal } from "@/app/jobs/[id]/actions";

const MAX_APPEAL_LENGTH = 500;

type Props = {
  reportId: string;
  appealedAt: string | null;
};

export default function NoShowAppealBlock({ reportId, appealedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const alreadyAppealed = !!appealedAt || submitted;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await submitNoShowAppeal(reportId, text);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "이의 제기에 실패했습니다.");
      return;
    }
    setSubmitted(true);
    setOpen(false);
    setText("");
    window.location.reload();
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4">
      {alreadyAppealed ? (
        <p className="text-sm font-medium text-amber-900">이미 이의 제기하셨습니다. 검토 후 연락드리겠습니다.</p>
      ) : (
        <>
          <p className="text-sm text-amber-900">노쇼로 처리되었습니다. 이의가 있으시면 이의 제기를 해 주세요.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 rounded-lg border border-amber-400 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-200"
          >
            이의 제기
          </button>
        </>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appeal-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="appeal-modal-title" className="text-lg font-semibold text-slate-900">
              노쇼 이의 제기
            </h3>
            <p className="mt-1 text-sm text-slate-500">이의 사유를 입력해 주세요. 검토 후 연락드리겠습니다.</p>
            <div className="mt-4">
              <label htmlFor="appeal-text" className="sr-only">
                이의 사유
              </label>
              <textarea
                id="appeal-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예: 출근했으나 노쇼로 기록되었습니다."
                maxLength={MAX_APPEAL_LENGTH}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {text.length} / {MAX_APPEAL_LENGTH}
              </p>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? "제출 중…" : "제출하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
