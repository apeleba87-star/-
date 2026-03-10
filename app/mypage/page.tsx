import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { glassCard } from "@/lib/ui-styles";
import MyPageForm from "./MyPageForm";

export default async function MypagePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/mypage");
  }

  const { data: worker } = await supabase
    .from("worker_profiles")
    .select("nickname, birth_year, gender, bio, contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const initial = {
    nickname: worker?.nickname ?? "",
    birth_year: worker?.birth_year ?? null,
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

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">구직 지원 정보</h2>
        <p className="text-sm text-slate-600 mb-4">
          지원하기를 누르기 전에 <strong>나이(출생년도)</strong>와 <strong>성별</strong>을 반드시 입력해 주세요. 마이페이지에서 수정할 수 있습니다.
        </p>
        <MyPageForm initial={initial} />
      </section>

      <p className="mt-6 text-center">
        <Link href="/jobs" className="text-sm font-medium text-emerald-600 hover:underline">
          인력 구인 목록으로
        </Link>
      </p>
    </div>
  );
}
