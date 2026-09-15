"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  adminDeleteQuestionAction,
  adminSuspendQuestionsUserAction,
  adminUnsuspendQuestionsUserAction,
} from "@/app/admin/questions/actions";
import { questionPath } from "@/lib/questions/constants";
import type { QuestionRow } from "@/lib/questions/types";

type Row = QuestionRow & {
  author_display_name: string | null;
  questions_suspended_at?: string | null;
  tag_summary?: string | null;
  tag_count?: number;
};

export default function AdminQuestionsPanel({ items }: { items: Row[] }) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) alert(res.error ?? "실패");
      else window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        각 글의 <strong className="font-bold text-teal-800">태그 지정</strong>에서
        제품·오염·재질·장소를 연결하세요. 태그가 없는 글은 주황 표시입니다.
      </p>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {items.map((q) => {
          const tagCount = q.tag_count ?? 0;
          const untagged = tagCount === 0;
          return (
            <li key={q.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="font-bold text-slate-900 hover:text-teal-800 hover:underline"
                    >
                      {q.title}
                    </Link>
                    {untagged ? (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                        태그 없음
                      </span>
                    ) : (
                      <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-bold text-teal-800">
                        태그 {tagCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    #{q.id} · {q.status}
                    {q.deleted_at ? " · 삭제됨" : ""} ·{" "}
                    {q.author_display_name ?? q.author_id.slice(0, 8)} ·{" "}
                    {new Date(q.created_at).toLocaleString("ko-KR")}
                    {q.questions_suspended_at ? " · 작성정지" : ""}
                  </p>
                  {q.tag_summary ? (
                    <p className="mt-1 text-xs text-slate-600">{q.tag_summary}</p>
                  ) : null}
                  <p className="mt-1">
                    <Link
                      href={questionPath(q.id, q.slug)}
                      className="text-xs font-medium text-slate-500 hover:text-teal-800 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      공개 페이지 보기 ↗
                    </Link>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/questions/${q.id}`}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      untagged
                        ? "bg-teal-700 text-white"
                        : "border border-teal-600 text-teal-800"
                    }`}
                  >
                    태그 지정
                  </Link>
                  {q.status === "published" && !q.deleted_at ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => adminDeleteQuestionAction(q.id))
                      }
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white"
                    >
                      삭제
                    </button>
                  ) : null}
                  {q.questions_suspended_at ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => adminUnsuspendQuestionsUserAction(q.author_id))
                      }
                      className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-bold text-white"
                    >
                      정지 해제
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          !confirm(
                            "이 계정을 정지하고 공개 글을 모두 숨길까요?",
                          )
                        ) {
                          return;
                        }
                        run(() =>
                          adminSuspendQuestionsUserAction(q.author_id, true),
                        );
                      }}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-800"
                    >
                      계정 정지
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">질문이 없습니다.</p>
      ) : null}
    </div>
  );
}
