import Link from "next/link";
import { questionPath } from "@/lib/questions/constants";
import type { QuestionListItem } from "@/lib/questions/types";

type Props = {
  productId: string;
  productName: string;
  questions: QuestionListItem[];
};

export default function ProductQuestionsBlock({
  productId,
  productName,
  questions,
}: Props) {
  return (
    <section
      id="questions"
      className="scroll-mt-28 border-t border-slate-200 px-4 py-10 sm:px-6"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          이 제품 관련 질문
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {productName}에 대해 궁금한 점이 있으신가요?
        </p>

        <div className="mt-4">
          <Link
            href="/questions"
            className="inline-flex rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            질문하기
          </Link>
        </div>

        {questions.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            아직 등록된 질문이 없습니다. 첫 질문을 남겨 보세요.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {questions.map((q) => (
              <li key={q.id}>
                <Link
                  href={questionPath(q.id, q.slug)}
                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-900">{q.title}</span>
                  <span
                    className={`shrink-0 text-xs ${
                      q.answer_count > 0
                        ? "font-bold text-teal-700"
                        : "text-slate-500"
                    }`}
                  >
                    답변 {q.answer_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
