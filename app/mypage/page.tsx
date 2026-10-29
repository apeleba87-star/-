import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
import { glassCard } from "@/lib/ui-styles";
import SignOutButton from "@/components/SignOutButton";
import MyPageQuestionsActivity from "@/components/mypage/MyPageQuestionsActivity";
import { listMyAnswers, listMyQuestions } from "@/lib/questions/queries";
import { computeAccess, SITE_ADMIN_ACCESS, type AccessRow } from "@/lib/ai-blog/access";
import MyPageAiBlogCard from "./MyPageAiBlogCard";
import MyPageForm from "./MyPageForm";

type AiBlogSubRow = {
  status: string | null;
  next_billing_at: string | null;
};

export default async function MypagePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/mypage");
  }

  const [
    { data: worker },
    myQuestions,
    myAnswers,
    { data: aiAccessRow },
    { data: siteProfile },
    { data: aiSub },
  ] = await Promise.all([
    supabase
      .from("worker_profiles")
      .select("nickname, birth_date, gender, bio, contact_phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    listMyQuestions(user.id),
    listMyAnswers(user.id),
    supabase
      .schema("cleanidex")
      .from("ai_blog_access")
      .select("plan_code, status, expires_on")
      .eq("user_id", user.id)
      .maybeSingle<AccessRow>(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string | null }>(),
    supabase
      .from("ai_blog_subscriptions")
      .select("status, next_billing_at")
      .eq("user_id", user.id)
      .maybeSingle<AiBlogSubRow>(),
  ]);
  const aiAccess = siteProfile?.role === "admin" ? SITE_ADMIN_ACCESS : computeAccess(aiAccessRow ?? null);

  const initial = {
    nickname: worker?.nickname ?? "",
    birth_date: worker?.birth_date ?? null,
    gender: worker?.gender ?? null,
    bio: worker?.bio ?? null,
    contact_phone: worker?.contact_phone ?? null,
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">마이페이지</h1>
        <p className="mt-1 text-sm text-slate-600">
          가입·프로필 정보와 내가 쓴 질문·답변을 확인합니다.
        </p>
      </div>

      <section className={`${glassCard} p-5 mb-6`}>
        <p className="text-sm text-slate-600">
          로그인 계정: <strong className="text-slate-800">{user.email}</strong>
        </p>
      </section>

      <MyPageAiBlogCard
        accessState={aiAccess.state}
        expiresOn={aiAccess.expires_on}
        subscriptionStatus={aiSub?.status ?? null}
        nextBillingAt={aiSub?.next_billing_at ?? null}
      />

      <section className="mb-10">
        <MyPageQuestionsActivity questions={myQuestions} answers={myAnswers} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">나의 정보</h2>
        <p className="text-sm text-slate-600 mb-4">
          별명·생일·성별 등 계정에 연결된 기본 정보입니다. 일부 서비스에서 활용될 수 있습니다.
        </p>
        <MyPageForm initial={initial} />
      </section>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="sr-only">계정</h2>
        <SignOutButton />
      </section>
    </div>
  );
}
