"use client";

import { useState } from "react";
import Link from "next/link";
import AnswerForm from "@/components/questions/AnswerForm";
import { questionPath } from "@/lib/questions/constants";
import type { QuestionDetail } from "@/lib/questions/types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authorInitial(name: string | null): string {
  const n = (name ?? "회").trim();
  return n.slice(0, 1) || "회";
}

type AnswerItem = QuestionDetail["answers"][number];
type ReplyItem = AnswerItem["replies"][number];

type Props = {
  question: QuestionDetail;
  canAnswer: boolean;
  canMarkOfficial: boolean;
  isLoggedIn: boolean;
};

function AnswerMeta({
  a,
}: {
  a: Pick<
    AnswerItem | ReplyItem,
    "author_display_name" | "author_role" | "is_official" | "created_at"
  >;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700"
        aria-hidden
      >
        {authorInitial(a.author_display_name)}
      </span>
      <span className="font-semibold text-slate-800">
        {a.author_display_name ?? "회원"}
      </span>
      {a.is_official ? (
        <span className="rounded-md bg-teal-700 px-1.5 py-0.5 font-bold text-white">
          클린아이덱스 공식
        </span>
      ) : null}
      {(a.author_role === "admin" || a.author_role === "editor") &&
      !a.is_official ? (
        <span className="font-medium text-slate-600">관리자</span>
      ) : null}
      <span>{formatDateTime(a.created_at)}</span>
    </div>
  );
}

export default function QuestionAnswersSection({
  question: q,
  canAnswer,
  canMarkOfficial,
  isLoggedIn,
}: Props) {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const totalComments =
    q.answers.length +
    q.answers.reduce((sum, a) => sum + (a.replies?.length ?? 0), 0);

  return (
    <section id="answers" className="mt-8 scroll-mt-24">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-black text-slate-900">
          답변 {totalComments}개
        </h2>
      </div>

      {q.answers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          아직 답변이 없습니다. 첫 답변을 남겨 보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {q.answers.map((a) => (
            <li
              key={a.id}
              className={`rounded-2xl border px-4 py-4 sm:px-5 ${
                a.is_official
                  ? "border-teal-300 bg-teal-50/70"
                  : "border-slate-200 bg-white"
              }`}
            >
              <AnswerMeta a={a} />
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 sm:text-[15px]">
                {a.body}
              </p>

              {isLoggedIn && canAnswer ? (
                <div className="mt-3">
                  {replyToId === a.id ? (
                    <AnswerForm
                      questionId={q.id}
                      parentAnswerId={a.id}
                      compact
                      onCancel={() => setReplyToId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyToId(a.id)}
                      className="text-xs font-bold text-teal-800 hover:underline"
                    >
                      답글
                    </button>
                  )}
                </div>
              ) : null}

              {(a.replies?.length ?? 0) > 0 ? (
                <ul className="mt-4 space-y-2 border-l-2 border-slate-200 pl-3 sm:pl-4">
                  {a.replies.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                    >
                      <AnswerMeta a={r} />
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {isLoggedIn && canAnswer ? (
          <AnswerForm questionId={q.id} canMarkOfficial={canMarkOfficial} />
        ) : isLoggedIn && !canAnswer ? (
          <p className="text-sm text-slate-500">답변 작성이 정지된 계정입니다.</p>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
            답변하려면{" "}
            <Link
              href={`/login?next=${encodeURIComponent(questionPath(q.id, q.slug))}`}
              className="font-bold text-teal-800 hover:underline"
            >
              로그인
            </Link>
            해 주세요.
          </p>
        )}
      </div>
    </section>
  );
}
