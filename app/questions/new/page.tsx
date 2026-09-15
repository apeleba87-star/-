import type { Metadata } from "next";
import Link from "next/link";
import QuestionForm from "@/components/questions/QuestionForm";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";
import { buildPageMetadata } from "@/lib/seo";
import { createServerSupabase } from "@/lib/supabase-server";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "질문 작성",
    description: "청소 제품·오염에 대해 질문합니다.",
    path: "/questions/new",
  }),
  robots: { index: false, follow: true },
};

type Props = {
  searchParams: Promise<{ product?: string }>;
};

export default async function NewQuestionPage({ searchParams }: Props) {
  const { product: productParam } = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = productParam
      ? `/questions/new?product=${encodeURIComponent(productParam)}`
      : "/questions/new";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-slate-950">로그인이 필요합니다</h1>
        <p className="mt-2 text-sm text-slate-600">질문 작성은 회원만 가능합니다.</p>
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="mt-6 inline-flex rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white"
        >
          로그인
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("questions_suspended_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.questions_suspended_at) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-slate-950">작성 정지</h1>
        <p className="mt-2 text-sm text-slate-600">
          이 계정은 질문 작성이 정지되었습니다.
        </p>
      </div>
    );
  }

  let productId: string | undefined;
  if (productParam) {
    const p = await getMergedProductById(productParam);
    if (p && p.status !== "draft") productId = p.id;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <nav className="mb-5 text-sm font-medium text-slate-500">
          <Link href="/questions" className="hover:text-teal-700">
            ← 질문 목록
          </Link>
        </nav>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          질문 작성
        </h1>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <QuestionForm productId={productId} />
        </div>
      </div>
    </main>
  );
}
