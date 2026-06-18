import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { magamListingTypeAccent } from "@/lib/magam/listing-type-style";

export function MagamSectionCard({
  children,
  className,
  padding = "p-[18px]",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 w-full rounded-[18px] border border-[#E3E6EC] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]",
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}

export function MagamComposeSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <MagamSectionCard>
      <div className="mb-3.5 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#141824] text-[13px] font-bold text-white">
          {step}
        </span>
        <h2 className="text-[17px] font-bold tracking-[-0.3px] text-[#141824]">{title}</h2>
      </div>
      {children}
    </MagamSectionCard>
  );
}

export function MagamSubLabel({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-[#5B6472]">{children}</p>;
}

export function MagamFieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#5B6472]">
      {children}
    </label>
  );
}

export const magamInputClass =
  "w-full rounded-[14px] border border-[#E3E6EC] bg-white px-4 py-3.5 text-[15px] text-[#141824] outline-none transition placeholder:text-[#8B93A1] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:opacity-50";

export const magamPrimaryBtnClass =
  "inline-flex min-h-[52px] w-full touch-manipulation select-none items-center justify-center rounded-[14px] bg-[#141824] px-5 text-base font-semibold tracking-[-0.2px] text-white transition duration-75 hover:bg-[#1f2638] active:scale-[0.98] active:opacity-90 disabled:pointer-events-none disabled:opacity-50";

export const magamOutlineBtnClass =
  "inline-flex min-h-12 w-full touch-manipulation select-none items-center justify-center rounded-[14px] border border-[#E3E6EC] bg-white px-4 text-sm font-semibold text-[#141824] transition duration-75 hover:bg-[#F2F3F6] active:scale-[0.98] active:bg-[#E8EAED] active:opacity-90 disabled:pointer-events-none disabled:opacity-50";

export function MagamErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-sm leading-relaxed text-[#DC2626]">
      {message}
    </div>
  );
}

export function MagamPreviewCard({ text }: { text: string }) {
  return (
    <div className="mb-3 rounded-[14px] border border-[#D6E4FF] bg-[#EEF3FF] p-4">
      <p className="text-[13px] font-semibold text-[#2563EB]">미리보기</p>
      <p className="mt-2 text-[15px] font-semibold leading-relaxed text-[#141824]">{text}</p>
    </div>
  );
}

export function MagamSuccessBanner({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mb-3 rounded-[18px] border border-[#A7F3D0] bg-[#ECFDF5] p-4">
      <p className="text-[15px] font-semibold text-[#141824]">{title}</p>
      <p className="mt-1 text-[13px] text-[#5B6472]">{body}</p>
    </div>
  );
}

export function MagamStatusBadge({ label, isOpen }: { label: string; isOpen: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        isOpen
          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]"
          : "border-[#E5E7EB] bg-[#F3F4F6] text-[#5B6472]"
      )}
    >
      {label}
    </span>
  );
}

export function MagamTypeBadge({
  listingType,
  hiringEmploymentType,
  tradeSide,
  muted = false,
}: {
  listingType: string;
  hiringEmploymentType?: string | null;
  tradeSide?: string | null;
  muted?: boolean;
}) {
  const label =
    listingType === "hiring"
      ? `구인 · ${hiringEmploymentType === "full_time" ? "정규직" : "일당"}`
      : listingType === "subcontract"
        ? "도급"
        : listingType === "trade"
          ? tradeSide === "buy"
            ? "매매 · 구매"
            : tradeSide === "sell"
              ? "매매 · 판매"
              : "매매"
          : listingType;
  const accent = magamListingTypeAccent(listingType);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-white",
        muted ? accent.badgeBgMuted : accent.badgeBg
      )}
    >
      {label}
    </span>
  );
}

export function MagamChoiceChip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[10px] border px-3.5 py-2 text-sm font-medium transition duration-75 touch-manipulation select-none active:scale-[0.97]",
        selected
          ? "border-[#2563EB] bg-[#EEF3FF] text-[#2563EB]"
          : "border-[#E3E6EC] bg-white text-[#141824] hover:bg-[#F2F3F6] active:bg-[#E8EAED]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {children}
    </button>
  );
}

export function MagamPageHeader({
  title,
  backHref,
  iconSrc,
}: {
  title: string;
  backHref?: string;
  /** 앱 아이콘 (예: /magam/app/icons/Icon-192.png) */
  iconSrc?: string;
}) {
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-[#E3E6EC]/80 bg-[#F2F3F6]/95 px-4 py-3 backdrop-blur-sm sm:-mx-0 sm:px-0">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {backHref ? (
          <a
            href={backHref}
            className="flex h-9 w-9 shrink-0 touch-manipulation select-none items-center justify-center rounded-full text-[#141824] transition duration-75 hover:bg-white/80 active:scale-95 active:bg-[#E8EAED]"
            aria-label="뒤로"
          >
            ←
          </a>
        ) : null}
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt=""
            width={28}
            height={28}
            className="shrink-0 rounded-[8px]"
          />
        ) : null}
        <h1 className="text-lg font-bold tracking-[-0.3px] text-[#141824]">{title}</h1>
      </div>
    </header>
  );
}

export function MagamDividerOr() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#E3E6EC]" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-3 text-[#5B6472]">또는</span>
      </div>
    </div>
  );
}
