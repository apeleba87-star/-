"use client";

import { magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_CLOSE_CONFIRM_ACTION,
  MAGAM_CLOSE_CONFIRM_BODY,
  MAGAM_CLOSE_CONFIRM_CANCEL,
  MAGAM_CLOSE_CONFIRM_HINT,
  MAGAM_CLOSE_CONFIRM_TITLE,
} from "@/lib/magam/copy";import { magamColors } from "@/lib/magam/theme";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function MagamCloseListingDialog({
  open,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="magam-close-title"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="magam-close-title" className="text-lg font-bold text-[#141824]">
          {MAGAM_CLOSE_CONFIRM_TITLE}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#5B6472]">{MAGAM_CLOSE_CONFIRM_BODY}</p>
        <p className="mt-2 text-[13px] font-semibold text-[#DC2626]">{MAGAM_CLOSE_CONFIRM_HINT}</p>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={`${magamPrimaryBtnClass} flex-1`}
          >
            {MAGAM_CLOSE_CONFIRM_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[14px] border-2 bg-[#FEF2F2] text-base font-bold disabled:opacity-50"
            style={{ borderColor: `${magamColors.danger}59`, color: magamColors.danger }}
          >
            {loading ? "마감 중…" : MAGAM_CLOSE_CONFIRM_ACTION}
          </button>
        </div>
      </div>
    </div>
  );
}
