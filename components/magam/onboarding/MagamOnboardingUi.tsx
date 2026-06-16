"use client";

import type { ReactNode } from "react";

import { magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  /** true면 배경 클릭으로 닫기 */
  dismissible?: boolean;
};

export function MagamOnboardingBackdrop({
  open,
  onClose,
  children,
  className,
  dismissible = false,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-[#141824]/55 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg touch-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4",
          className
        )}
        data-magam-onboarding-scroll
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function MagamOnboardingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-[#E3E6EC] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MagamOnboardingActions({
  onSkip,
  onPrimary,
  primaryLabel,
  skipLabel = "건너뛰기",
  showSkip = true,
}: {
  onSkip?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  skipLabel?: string;
  showSkip?: boolean;
}) {
  return (
    <div className="flex gap-2 border-t border-[#E3E6EC] p-4">
      {showSkip && onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-[12px] text-[15px] font-semibold text-[#5B6472]"
        >
          {skipLabel}
        </button>
      ) : null}
      <button type="button" onClick={onPrimary} className={cn(magamPrimaryBtnClass, "flex-1")}>
        {primaryLabel}
      </button>
    </div>
  );
}

function SlideVisual({ kind }: { kind: "write" | "share" | "close" }) {
  if (kind === "write") {
    return (
      <div className="mx-auto w-full max-w-[240px] rounded-[14px] border border-[#E3E6EC] bg-[#F8F9FB] p-3 text-left">
        <div className="flex gap-2">
          <span className="rounded-full bg-[#2563EB] px-2.5 py-1 text-[11px] font-bold text-white">도급</span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5B6472]">구인</span>
        </div>
        <p className="mt-2 text-[13px] font-semibold text-[#141824]">성북구 · 신축입주 27평</p>
        <p className="mt-1 text-[12px] text-[#5B6472]">오전 · 13만원</p>
      </div>
    );
  }

  if (kind === "share") {
    return (
      <div className="mx-auto w-full max-w-[240px] space-y-2">
        <div className="rounded-[14px] bg-[#FEE500] px-3 py-2.5 text-center text-[13px] font-bold text-[#191919]">
          단톡방 모집 글 복사
        </div>
        <div className="rounded-[12px] bg-[#BACEE0] px-3 py-2">
          <div className="ml-auto max-w-[85%] rounded-[10px] bg-[#FEE500] px-2.5 py-2 text-[11px] leading-snug text-[#191919]">
            내일 도급 / 성북구 27평…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[260px] space-y-2.5">
      <div
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-[#DC262659] bg-[#FEF2F2] px-4 py-3.5 text-[15px] font-extrabold tracking-[-0.2px] text-[#DC2626]"
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        모집 마감하기
      </div>
      <p className="text-center text-[12px] leading-relaxed text-[#5B6472]">
        마감 후 공유 링크에서 <span className="font-semibold text-[#141824]">연락처 숨김</span>
        <br />
        010-****-****
      </p>
    </div>
  );
}

export function MagamOnboardingSlideVisual({ kind }: { kind: "write" | "share" | "close" }) {
  return (
    <div
      className={`flex items-center justify-center bg-[#F2F3F6] px-6 py-5 ${
        kind === "close" ? "min-h-[148px]" : "min-h-[120px]"
      }`}
    >
      <SlideVisual kind={kind} />
    </div>
  );
}
