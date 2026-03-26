import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
import { glassCard } from "@/lib/ui-styles";
import SignOutButton from "@/components/SignOutButton";
import MyPageForm from "./MyPageForm";
import MyPageSubscriptionCard from "./MyPageSubscriptionCard";

export default async function MypagePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/mypage");
  }

  const [workerRes, profileRes, subRes] = await Promise.all([
    supabase
      .from("worker_profiles")
      .select("nickname, birth_date, gender, bio, contact_phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("status, next_billing_at").eq("user_id", user.id).maybeSingle(),
  ]);

  const worker = workerRes.data;
  const isAdmin = profileRes.data?.role === "admin" || profileRes.data?.role === "editor";
  const sub = subRes.data as { status?: string; next_billing_at?: string | null } | null;

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
          인력 구인 지원에 필요한 정보를 입력·수정합니다.
        </p>
      </div>

      <section className={`${glassCard} p-5 mb-6`}>
        <p className="text-sm text-slate-600">
          로그인 계정: <strong className="text-slate-800">{user.email}</strong>
        </p>
      </section>

      <section className="mb-6">
        <MyPageSubscriptionCard
          status={sub?.status === "active" || sub?.status === "cancelled" || sub?.status === "past_due" ? sub.status : null}
          nextBillingAt={sub?.next_billing_at ?? null}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">구직 지원 정보</h2>
        <p className="text-sm text-slate-600 mb-4">
          지원하기를 누르기 전에 <strong>생일</strong>과 <strong>성별</strong>을 반드시 입력해 주세요. 마이페이지에서 수정할 수 있습니다.
        </p>
        <MyPageForm initial={initial} />
      </section>

      <section className={`${glassCard} p-5 mt-6`}>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">바로가기</h2>
        <ul className="space-y-2">
          {isAdmin && (
            <li>
              <Link href="/admin" className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm font-medium text-teal-800 hover:bg-teal-100">
                관리자 모드
              </Link>
            </li>
          )}
          <li>
            <Link href="/jobs/manage" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
              내 구인 관리
            </Link>
          </li>
          <li>
            <Link href="/jobs" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
              인력 구인 목록
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="sr-only">계정</h2>
        <SignOutButton />
      </section>
    </div>
  );
}
