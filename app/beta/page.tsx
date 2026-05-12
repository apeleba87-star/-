import type { Metadata } from "next";
import Link from "next/link";
import BetaTesterApplyForm from "@/components/beta/BetaTesterApplyForm";

const DISPLAY = "[font-family:var(--font-site-display),sans-serif]";

export const metadata: Metadata = {
  title: "베타테스터 모집 — 클린아이덱스",
  description:
    "클린아이덱스 베타테스터를 모집합니다. 현장 사진·체크리스트·고객 확인으로 작업 완료를 증명하는 시스템을 함께 다듬어 주세요.",
};

export default function BetaRecruitmentPage() {
  return (
    <div className="min-h-screen bg-zinc-100 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(120,113,198,0.08),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(14,165,233,0.05),transparent_45%)]">
      <div className="page-shell py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">클린아이덱스</p>
          <h1 className={`${DISPLAY} mt-2 text-center text-[clamp(1.5rem,5vw,2.25rem)] font-normal leading-tight tracking-[-0.04em] text-zinc-900`}>
            베타테스터 모집
          </h1>
          <p className={`${DISPLAY} mt-6 text-center text-[clamp(1.25rem,3.5vw,1.75rem)] leading-snug tracking-[-0.03em] text-zinc-800`}>
            계약서 쓰고도
            <br />
            <span className="text-zinc-500">돈 못 받는 시대,</span>{" "}
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">끝냅니다.</span>
          </p>
          <div className="mt-6 space-y-3 text-center text-sm leading-relaxed text-zinc-600 sm:text-base">
            <p>
              현장 사진 · 체크리스트 · 고객 확인 기록으로
              <br />
              <strong className="font-semibold text-zinc-900">&quot;작업 완료&quot;를 증명하는 시스템</strong>
            </p>
            <p>현재 실제 현장업 사장님들과 함께 클린아이덱스를 고도화하고 있습니다.</p>
            <p className="font-medium text-zinc-800">
              베타 유저분들께는 우선 사용 권한 + 평생 할인 혜택을 제공합니다.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-zinc-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-teal-700 underline-offset-2 hover:underline">
              로그인
            </Link>
          </p>

          <div className="mt-10">
            <BetaTesterApplyForm />
          </div>
        </div>
      </div>
    </div>
  );
}
