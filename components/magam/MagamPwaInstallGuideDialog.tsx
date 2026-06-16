"use client";

import { magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_PWA_INSTALL_GUIDE_CONFIRM,
  MAGAM_PWA_INSTALL_GUIDE_STEPS,
  MAGAM_PWA_INSTALL_GUIDE_TITLE,
} from "@/lib/magam/copy";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MagamPwaInstallGuideDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="magam-pwa-install-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="magam-pwa-install-title" className="text-lg font-bold text-[#141824]">
          {MAGAM_PWA_INSTALL_GUIDE_TITLE}
        </h2>
        <ol className="mt-4 list-none space-y-3">
          {MAGAM_PWA_INSTALL_GUIDE_STEPS.map((step, index) => (
            <li key={step} className="text-[15px] leading-relaxed text-[#5B6472]">
              <span className="font-semibold text-[#141824]">{index + 1}. </span>
              {step}
            </li>
          ))}
        </ol>
        <button type="button" onClick={onClose} className={`${magamPrimaryBtnClass} mt-6`}>
          {MAGAM_PWA_INSTALL_GUIDE_CONFIRM}
        </button>
      </div>
    </div>
  );
}
