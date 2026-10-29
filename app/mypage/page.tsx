import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, FileText, MessageCircleQuestion, UserRound } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";
import { listMyAnswers, listMyQuestions } from "@/lib/questions/queries";
import { computeAccess, SITE_ADMIN_ACCESS, type AccessRow } from "@/lib/ai-blog/access";
import { glassCard } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type AiBlogSubRow = { status: string | null; next_billing_at: string | null };

function HubLink({
  href,
  title,
  description,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  Icon: typeof UserRound;
}) {
  return (
    <Link
      href={href}
      className={`${glassCard} flex items-center gap-4 p-4 transition hover:border-emerald-300 hover:bg-white/80`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
    </Link>
  );
}

export default async function MypagePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  const [{ data: worker }, myQuestions, myAnswers, { data: aiAccessRow }, { data: siteProfile }, { data: aiSub }] =
    await Promise.all([
      supabase.from("worker_profiles").select("nickname").eq("user_id", user.id).maybeSingle(),
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
  const displayName = worker?.nickname?.trim() || user.email || "회원";

  let aiBlogHint = "이용·구독 관리";
  if (aiSub?.status === "active") aiBlogHint = "구독 중 · 해지는 여기서";
  else if (aiSub?.status === "cancelled") aiBlogHint = "해지 예정 · 기간까지 이용";
  else if (aiAccess.state === "active") aiBlogHint = "이용 가능 · 구독 확인";
  else aiBlogHint = "구독·이용 안내";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">마이페이지</h1>
        <p className="mt-1 text-sm text-slate-600">
          <strong className="font-medium text-slate-800">{displayName}</strong>
          {user.email ? <span className="text-slate-500"> · {user.email}</span> : null}
        </p>
      </div>

      <nav className="space-y-3" aria-label="마이페이지 메뉴">
        <HubLink
          href="/mypage/profile"
          title="내 정보"
          description="별명·연락처 등 기본 정보"
          Icon={UserRound}
        />
        <HubLink
          href="/mypage/questions"
          title="내 질문"
          description={`질문 ${myQuestions.length} · 답변 ${myAnswers.length}`}
          Icon={MessageCircleQuestion}
        />
        <HubLink href="/mypage/ai-blog" title="AI 블로그" description={aiBlogHint} Icon={FileText} />
      </nav>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <SignOutButton />
      </section>
    </div>
  );
}
