"use client";

import {
  MAGAM_ONBOARDING_GOT_IT,
  MAGAM_ONBOARDING_SHARE_NUDGE_BODY,
  MAGAM_ONBOARDING_SHARE_NUDGE_TITLE,
} from "@/lib/magam/copy";

type Props = {
  onDismiss: () => void;
};

export default function MagamShareNudge({ onDismiss }: Props) {
  return (
    <div className="mb-3 rounded-[14px] border-2 border-[#2563EB] bg-[#EEF3FF] px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          🎉
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[#141824]">{MAGAM_ONBOARDING_SHARE_NUDGE_TITLE}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#5B6472]">
            {MAGAM_ONBOARDING_SHARE_NUDGE_BODY}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[12px] font-semibold text-[#2563EB]"
        >
          {MAGAM_ONBOARDING_GOT_IT}
        </button>
      </div>
    </div>
  );
}
