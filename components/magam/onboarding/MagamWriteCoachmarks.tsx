"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MagamOnboardingActions,
  MagamOnboardingBackdrop,
  MagamOnboardingCard,
} from "@/components/magam/onboarding/MagamOnboardingUi";
import { MagamWriteOnboardingVisual } from "@/components/magam/onboarding/MagamWriteOnboardingVisual";
import {
  MAGAM_ONBOARDING_NEXT,
  MAGAM_ONBOARDING_SKIP,
  MAGAM_ONBOARDING_WRITE_START,
  MAGAM_ONBOARDING_WRITE_STEPS,
} from "@/lib/magam/copy";
import {
  markMagamOnboardingDone,
  shouldShowMagamOnboarding,
} from "@/lib/magam/onboarding";
import {
  lockPageScroll,
  preventBackgroundScrollWhileOverlay,
} from "@/lib/magam/onboarding-scroll-lock";
import { magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import { cn } from "@/lib/utils";

export default function MagamWriteCoachmarks() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const unlockScrollRef = useRef<(() => void) | null>(null);

  const current = MAGAM_ONBOARDING_WRITE_STEPS[step];
  const isLast = step >= MAGAM_ONBOARDING_WRITE_STEPS.length - 1;

  useEffect(() => {
    setOpen(shouldShowMagamOnboarding("write"));
  }, []);

  useEffect(() => {
    if (!open) {
      unlockScrollRef.current?.();
      unlockScrollRef.current = null;
      return;
    }
    unlockScrollRef.current = lockPageScroll();
    return () => {
      unlockScrollRef.current?.();
      unlockScrollRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return preventBackgroundScrollWhileOverlay(true);
  }, [open]);

  const finish = useCallback(() => {
    markMagamOnboardingDone("write");
    setOpen(false);
  }, []);

  if (!open || !current) return null;

  return (
    <MagamOnboardingBackdrop open={open}>
      <MagamOnboardingCard>
        <div className="flex min-h-[148px] items-center justify-center bg-[#F2F3F6] px-4 py-5">
          <MagamWriteOnboardingVisual kind={current.visual} />
        </div>

        <div className="px-5 pb-2 pt-4 text-center">
          <div className="flex justify-center gap-1.5" aria-hidden>
            {MAGAM_ONBOARDING_WRITE_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-5 bg-[#2563EB]" : "w-1.5 bg-[#D1D5DB]"
                }`}
              />
            ))}
          </div>
          <h2 className="mt-3 text-[18px] font-bold tracking-[-0.3px] text-[#141824]">
            {current.title}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-[#5B6472]">{current.body}</p>
        </div>

        {isLast ? (
          <div className="border-t border-[#E3E6EC] p-4">
            <button type="button" onClick={finish} className={cn(magamPrimaryBtnClass, "w-full")}>
              {MAGAM_ONBOARDING_WRITE_START}
            </button>
          </div>
        ) : (
          <MagamOnboardingActions
            onSkip={finish}
            onPrimary={() => setStep((s) => s + 1)}
            primaryLabel={MAGAM_ONBOARDING_NEXT}
            skipLabel={MAGAM_ONBOARDING_SKIP}
          />
        )}
      </MagamOnboardingCard>
    </MagamOnboardingBackdrop>
  );
}
