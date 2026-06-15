"use client";

import { magamColors } from "@/lib/magam/theme";

type Props = {
  onClick: () => void;
  loading?: boolean;
};

export default function MagamCloseListingButton({ onClick, loading = false }: Props) {
  const disabled = loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full min-h-[58px] items-center justify-center gap-2.5 rounded-[18px] border-[1.5px] bg-[#FEF2F2] px-[18px] py-[18px] text-[17px] font-extrabold tracking-[-0.2px] transition disabled:cursor-not-allowed"
      style={{
        borderColor: disabled ? magamColors.border : `${magamColors.danger}59`,
        color: disabled ? magamColors.inkFaint : magamColors.danger,
      }}
    >
      {loading ? (
        <span
          className="inline-block h-[22px] w-[22px] animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {loading ? "마감 중…" : "모집 마감하기"}
    </button>
  );
}
