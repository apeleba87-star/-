import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AiBlogNav from "@/components/ai-blog/AiBlogNav";
import { EXPIRY_WARNING_DAYS } from "@/lib/ai-blog/access";
import { getAiBlogUser, loadUsage } from "@/lib/ai-blog/server";
import { ensureAiBlogTrial } from "@/lib/ai-blog/trial";
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
        현장 등록·사진 맞추기까지는 바로 할 수 있습니다. AI로 글을 만들 때는{" "}
        <Link href="/ai-blog/subscribe" className="font-semibold underline hover:text-amber-950">
          100원 특가 구독
        </Link>
        후 이용할 수 있습니다.
      </div>
    );
  }
  if (access.state === "suspended") {
    return (
      <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        AI 글 생성이 정지되었습니다. 현장·사진 편집과 네이버로 옮기기는 계속 가능합니다. 클린아이덱스 관리자에게 문의해
        주세요.
      </div>
    );
  }
  if (access.state === "expired") {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        AI 블로그 이용 기간이 {access.expires_on}에 끝났습니다. 현장·사진 편집은 계속 가능하고, AI 글 만들기는{" "}
        <Link href="/ai-blog/subscribe" className="font-semibold underline hover:text-amber-950">
          구독 연장
        </Link>
        후 이용할 수 있습니다.
      </div>
    );
  }
  // TRIAL: 남은 일수·「무료 체험」카운트다운은 결제 유인을 깎으므로 노출하지 않음.
  // 유료 만료 임박만 안내.
  if (
    access.state === "active" &&
    access.plan_code !== "TRIAL" &&
    access.days_left != null &&
    access.days_left <= EXPIRY_WARNING_DAYS
  ) {
    return (
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        AI 블로그 이용 기간이 {access.days_left === 0 ? "오늘" : `${access.days_left}일 후`} 끝납니다 (만료일{" "}
        {access.expires_on}).{" "}
        <Link href="/ai-blog/subscribe" className="font-semibold underline hover:text-sky-950">
          구독 확인·연장
        </Link>
      </div>
    );
  }
  return null;
}

export default async function AiBlogLayout({ children }: { children: React.ReactNode }) {
  const got = await getAiBlogUser();
  if (!got) redirect("/login?next=/ai-blog");

  // 권한 없으면 무료 체험 1회 자동 부여 후 새로고침
  if (got.user.access.state === "none") {
    const trial = await ensureAiBlogTrial(got.user.userId);
    if (trial.granted) {
      redirect("/ai-blog");
    }
  }

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
