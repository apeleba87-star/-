import Link from "next/link";
import { questionPath } from "@/lib/questions/constants";
import type { MyAnswerItem, MyQuestionItem } from "@/lib/questions/queries";
import { glassCard } from "@/lib/ui-styles";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function excerpt(text: string, max = 80): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max).trim()}…`;
}

type Props = {
  questions: MyQuestionItem[];
  answers: MyAnswerItem[];
};

export default function MyPageQuestionsActivity({ questions, answers }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">내 질문</h2>
          <Link
            href="/questions"
            className="text-sm font-medium text-teal-800 hover:underline"
          >
            게시판
          </Link>
        </div>
        {questions.length === 0 ? (
          <p className={`${glassCard} p-4 text-sm text-slate-500`}>
            아직 작성한 질문이 없습니다.{" "}
            <Link href="/questions/new" className="font-medium text-teal-800 hover:underline">
              질문하기
            </Link>
          </p>
        ) : (
          <ul className={`${glassCard} divide-y divide-slate-100 overflow-hidden`}>
            {questions.map((q) => (
              <li key={q.id}>
                <Link
                  href={questionPath(q.id, q.slug)}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <p className="font-semibold text-slate-900">{q.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(q.created_at)} · 답변 {q.answer_count} · 조회{" "}
                    {q.view_count.toLocaleString("ko-KR")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">내 답변</h2>
        {answers.length === 0 ? (
          <p className={`${glassCard} p-4 text-sm text-slate-500`}>
            아직 작성한 답변이 없습니다.
          </p>
        ) : (
          <ul className={`${glassCard} divide-y divide-slate-100 overflow-hidden`}>
            {answers.map((a) => (
              <li key={a.id}>
                <Link
                  href={questionPath(a.question_id, a.question_slug)}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <p className="text-xs font-medium text-slate-500">
                    {a.question_title}
                    {a.is_official ? " · 공식" : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{excerpt(a.body)}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
