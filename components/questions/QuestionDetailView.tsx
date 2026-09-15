import Link from "next/link";
import {
  Clock,
  Eye,
  LayoutGrid,
  MessageCircle,
  UserRound,
} from "lucide-react";
import QuestionAnswersSection from "@/components/questions/QuestionAnswersSection";
import RecordQuestionView from "@/components/questions/RecordQuestionView";
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

type ProductCard = {
  id: string;
  name: string;
  brand: string;
  summary?: string;
  href: string;
};

type Props = {
  question: QuestionDetail;
  productCards: ProductCard[];
  canAnswer: boolean;
  canMarkOfficial: boolean;
  isLoggedIn: boolean;
};

export default function QuestionDetailView({
  question: q,
  productCards,
  canAnswer,
  canMarkOfficial,
  isLoggedIn,
}: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <RecordQuestionView questionId={q.id} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="mb-5 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <Link href="/questions" className="hover:text-teal-700">
            청소 질문
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">상세</span>
        </nav>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
            <h1 className="text-2xl font-black leading-snug tracking-tight text-slate-950 sm:text-3xl">
              {q.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800"
                  aria-hidden
                >
                  {authorInitial(q.author_display_name)}
                </span>
                <UserRound className="h-3.5 w-3.5 text-slate-400 sm:hidden" aria-hidden />
                {q.author_display_name?.trim() || "회원"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {formatDateTime(q.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                조회 {Number(q.view_count ?? 0).toLocaleString("ko-KR")}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  q.answer_count > 0 ? "text-teal-700" : "text-slate-600"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                답변 {q.answer_count}
              </span>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800 sm:text-base">
              {q.body}
            </div>

            {productCards.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                  관련 제품
                </h2>
                <ul className="mt-3 space-y-2">
                  {productCards.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={p.href}
                        className="block rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition hover:border-teal-300 hover:bg-teal-50/40"
                      >
                        <span className="font-bold text-slate-950">{p.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{p.brand}</span>
                        {p.summary ? (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                            {p.summary}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </article>

        <QuestionAnswersSection
          question={q}
          canAnswer={canAnswer}
          canMarkOfficial={canMarkOfficial}
          isLoggedIn={isLoggedIn}
        />

        {q.resolved_links.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-base font-black text-slate-900">관련 정보</h2>
            <p className="mt-1 text-xs text-slate-500">
              이 질문에 연결된 제품·오염·재질·장소입니다.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.resolved_links.map((link) =>
                link.href ? (
                  <li key={`${link.entity_type}:${link.entity_id}`}>
                    <Link
                      href={link.href}
                      className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 hover:border-teal-300 hover:bg-teal-50/50"
                      rel={
                        link.href.startsWith("http") ? "ugc nofollow" : undefined
                      }
                    >
                      <span className="text-sm font-semibold text-teal-800">
                        {link.label}
                      </span>
                      {link.subtitle ? (
                        <span className="text-xs text-slate-500">{link.subtitle}</span>
                      ) : null}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}

        <div className="mt-8">
          <Link
            href="/questions"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-300 hover:text-teal-800"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            목록
          </Link>
        </div>
      </div>
    </main>
  );
}
