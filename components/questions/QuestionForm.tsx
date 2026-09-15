"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuestionAction } from "@/app/questions/actions";
import { questionPath } from "@/lib/questions/constants";

type Props = {
  /** 제품 페이지 CTA — UI에 안 보이고 서버에서만 연결 */
  productId?: string;
};

export default function QuestionForm({ productId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createQuestionAction({
        title,
        body,
        productId: productId || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.questionId && res.slug) {
        router.push(questionPath(res.questionId, res.slug));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-bold text-slate-800">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={4}
          maxLength={200}
          placeholder="예: 사니칼로 샤워부스 유리 물때 제거해도 되나요?"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-teal-600/30 focus:ring-2"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-slate-800">내용</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={10000}
          rows={10}
          placeholder="궁금한 점을 적어 주세요."
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-teal-600/30 focus:ring-2"
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "등록 중…" : "질문 등록"}
      </button>
    </form>
  );
}
