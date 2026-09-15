"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnswerAction } from "@/app/questions/actions";

type Props = {
  questionId: number;
  canMarkOfficial?: boolean;
  parentAnswerId?: string;
  onCancel?: () => void;
  compact?: boolean;
};

export default function AnswerForm({
  questionId,
  canMarkOfficial = false,
  parentAnswerId,
  onCancel,
  compact = false,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isReply = Boolean(parentAnswerId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createAnswerAction({
        questionId,
        body,
        isOfficial: !isReply && canMarkOfficial ? isOfficial : false,
        parentAnswerId: parentAnswerId || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setIsOfficial(false);
      onCancel?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
          : "space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
      }
    >
      {!compact ? (
        <h2 className="text-base font-black text-slate-900">
          {isReply ? "답글 작성" : "답변 작성"}
        </h2>
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={2}
        maxLength={10000}
        rows={compact ? 3 : 5}
        placeholder={
          isReply ? "답글을 남겨 주세요." : "경험을 바탕으로 답변해 주세요."
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-teal-600/30 focus:ring-2"
      />
      {!isReply && canMarkOfficial ? (
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "등록 중…" : isReply ? "답글 등록" : "답변 등록"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            취소
          </button>
        ) : null}
      </div>
    </form>
  );
}
