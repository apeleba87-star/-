"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";

const SIDO_OPTIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

type Props = {
  currentLabel: string;
  currentSido: string;
  currentSigungu: string | null;
};

export default function PublicJobRegionPicker({
  currentLabel,
  currentSido,
  currentSigungu,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sido, setSido] = useState(currentSido);
  const [sigungu, setSigungu] = useState(currentSigungu ?? "");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await fetch("/api/jobs-public/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sido,
          sigungu: sigungu.trim() || null,
        }),
      });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[48px] rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-lg font-semibold text-slate-900"
        aria-haspopup="dialog"
      >
        📍 {currentLabel}{" "}
        <span className="text-base font-medium text-blue-800">({PUBLIC_JOBS_COPY.regionButton})</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="region-picker-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="region-picker-title" className="text-xl font-bold text-slate-900">
              {PUBLIC_JOBS_COPY.regionButton}
            </h2>
            <label className="mt-4 block text-base font-medium text-slate-700">
              시·도
              <select
                value={sido}
                onChange={(e) => setSido(e.target.value)}
                className="mt-2 w-full min-h-[48px] rounded-lg border border-slate-300 px-3 text-lg"
              >
                {SIDO_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-base font-medium text-slate-700">
              구·군 (선택, 비우면 전체)
              <input
                type="text"
                value={sigungu}
                onChange={(e) => setSigungu(e.target.value)}
                placeholder="예: 강남구"
                className="mt-2 w-full min-h-[48px] rounded-lg border border-slate-300 px-3 text-lg"
              />
            </label>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[48px] flex-1 rounded-xl border border-slate-300 text-lg font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="min-h-[48px] flex-1 rounded-xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-50"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
