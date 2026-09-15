"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnswerAction } from "@/app/questions/actions";

type Props = {
  questionId: number;
  canMarkOfficial: boolean;
};

export default function AnswerForm({ questionId, canMarkOfficial }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createAnswerAction({
        questionId,
        body,
        isOfficial: canMarkOfficial ? isOfficial : false,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setIsOfficial(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-base font-black text-slate-900">답변 작성</h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={2}
        maxLength={10000}
        rows={5}
        placeholder="경험을 바탕으로 답변해 주세요."
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-teal-600/30 focus:ring-2"
      />
      {canMarkOfficial ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isOfficial}
            onChange={(e) => setIsOfficial(e.target.checked)}
          />
          클린아이덱스 공식 답변으로 표시
        </label>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-rose-700">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "등록 중…" : "답변 등록"}
      </button>
    </form>
  );
}
