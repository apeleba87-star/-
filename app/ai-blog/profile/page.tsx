import ProfileForm from "@/components/ai-blog/ProfileForm";
import { getAiBlogUser, loadProfile } from "@/lib/ai-blog/server";

export const dynamic = "force-dynamic";

export default async function AiBlogProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const got = await getAiBlogUser();
  const profile = got?.user.companyId ? await loadProfile(got.supabase, got.user.companyId) : null;
  const blocked = Boolean(got?.user.companyId && got.user.roleCode !== "admin");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">업체 프로필</h1>
        <p className="mt-1 text-sm text-slate-600">
          처음 한 번만 입력하면 AI 블로그 초안을 만들 때마다 자동으로 불러옵니다.
        </p>
      </div>
      {welcome && !profile ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          AI 블로그를 시작하려면 업체 정보를 먼저 등록해 주세요. 업체명만 입력해도 시작할 수 있습니다.
        </div>
      ) : null}
      {blocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          AI 블로그는 업체 대표(관리자) 계정만 사용할 수 있습니다.
        </div>
      ) : (
        <ProfileForm initial={profile} />
      )}
    </div>
  );
}
