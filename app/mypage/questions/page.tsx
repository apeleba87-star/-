import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import MyPageQuestionsActivity from "@/components/mypage/MyPageQuestionsActivity";
import { listMyAnswers, listMyQuestions } from "@/lib/questions/queries";

export const dynamic = "force-dynamic";

export default async function MyPageQuestionsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/questions");

  const [myQuestions, myAnswers] = await Promise.all([
    listMyQuestions(user.id),
    listMyAnswers(user.id),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/mypage" className="hover:underline">
          마이페이지
        </Link>
        <span className="mx-1.5">/</span>
        내 질문
      </p>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">내 질문</h1>
      <MyPageQuestionsActivity questions={myQuestions} answers={myAnswers} />
    </div>
  );
}
