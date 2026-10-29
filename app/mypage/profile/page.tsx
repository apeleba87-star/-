import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import MyPageForm from "../MyPageForm";

export const dynamic = "force-dynamic";

export default async function MyPageProfilePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/profile");

  const { data: worker } = await supabase
    .from("worker_profiles")
    .select("nickname, birth_date, gender, bio, contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const initial = {
    nickname: worker?.nickname ?? "",
    birth_date: worker?.birth_date ?? null,
    gender: worker?.gender ?? null,
    bio: worker?.bio ?? null,
    contact_phone: worker?.contact_phone ?? null,
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/mypage" className="hover:underline">
          마이페이지
        </Link>
        <span className="mx-1.5">/</span>
        내 정보
      </p>
      <h1 className="text-2xl font-bold text-slate-900">내 정보</h1>
      <p className="mt-1 mb-2 text-sm text-slate-600">로그인 계정: {user.email}</p>
      <p className="mb-6 text-sm text-slate-600">
        별명·생일·성별 등 계정에 연결된 기본 정보입니다. 일부 서비스에서 활용될 수 있습니다.
      </p>
      <MyPageForm initial={initial} />
    </div>
  );
}
