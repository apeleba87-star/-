"use client";

import { useEffect, useState } from "react";

import { magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import { MAGAM_INSTALL_GUIDE_STEPS, MAGAM_INSTALL_GUIDE_TITLE } from "@/lib/magam/copy";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MagamInstallGuideDialog({ open, onClose }: Props) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="magam-install-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="magam-install-title" className="text-lg font-bold text-[#141824]">
          {MAGAM_INSTALL_GUIDE_TITLE}
        </h2>
        <ol className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-[#141824]">
          {MAGAM_INSTALL_GUIDE_STEPS.map((step, i) => (
            <li key={step}>
              {i + 1}. {step}
            </li>
          ))}
        </ol>
        <button type="button" onClick={onClose} className={`${magamPrimaryBtnClass} mt-5`}>
          확인
        </button>
      </div>
    </div>
  );
}
