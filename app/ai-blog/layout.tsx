import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AiBlogNav from "@/components/ai-blog/AiBlogNav";
import { EXPIRY_WARNING_DAYS } from "@/lib/ai-blog/access";
import { getAiBlogUser, loadUsage } from "@/lib/ai-blog/server";
import type { AiAccess } from "@/lib/ai-blog/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 블로그",
  robots: { index: false, follow: false },
};

function AccessBanner({ access }: { access: AiAccess }) {
  if (access.state === "none") {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        아직 AI 블로그 사용 권한이 없습니다. 화면은 둘러볼 수 있지만 저장과 AI 생성은 권한을 받은 뒤에 가능합니다.
        이용을 원하시면 클린아이덱스 관리자에게 문의해 주세요.
      </div>
    );
  }
  if (access.state === "suspended") {
    return (
      <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        AI 블로그 사용이 정지되었습니다. 기존 현장·초안 보기와 네이버로 옮기기만 가능합니다. 클린아이덱스 관리자에게
        문의해 주세요.
      </div>
    );
  }
  if (access.state === "expired") {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        AI 블로그 이용 기간이 {access.expires_on}에 끝났습니다. 기존 현장·초안 보기와 네이버로 옮기기만 가능합니다.
        기간 연장은 클린아이덱스 관리자에게 문의해 주세요.
      </div>
    );
  }
  if (access.state === "active" && access.days_left != null && access.days_left <= EXPIRY_WARNING_DAYS) {
    return (
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        AI 블로그 이용 기간이 {access.days_left === 0 ? "오늘" : `${access.days_left}일 후`} 끝납니다 (만료일{" "}
        {access.expires_on}). 계속 이용하려면 클린아이덱스 관리자에게 연장을 요청해 주세요.
      </div>
    );
  }
  return null;
}

export default async function AiBlogLayout({ children }: { children: React.ReactNode }) {
  const got = await getAiBlogUser();
  if (!got) redirect("/login?next=/ai-blog");
  const { access } = got.user;
  const usage = got.user.companyId ? await loadUsage(got.supabase) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AiBlogNav usage={usage} access={access} />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <AccessBanner access={access} />
        {children}
      </div>
    </div>
  );
}
