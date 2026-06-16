"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MagamOnboardingActions,
  MagamOnboardingBackdrop,
  MagamOnboardingCard,
  MagamOnboardingSlideVisual,
} from "@/components/magam/onboarding/MagamOnboardingUi";
import {
  MAGAM_ONBOARDING_NEXT,
  MAGAM_ONBOARDING_SKIP,
  MAGAM_ONBOARDING_SLIDES,
  MAGAM_ONBOARDING_START,
} from "@/lib/magam/copy";
import {
  markMagamOnboardingDone,
  shouldShowMagamOnboarding,
} from "@/lib/magam/onboarding";
import {
  lockPageScroll,
  preventTouchScrollWhileLocked,
} from "@/lib/magam/onboarding-scroll-lock";

type Props = {
  onComplete?: () => void;
};

export default function MagamOnboardingCarousel({ onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const unlockScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setOpen(shouldShowMagamOnboarding("carousel"));
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
    return preventTouchScrollWhileLocked(true);
  }, [open]);

  const finish = useCallback(() => {
    markMagamOnboardingDone("carousel");
    setOpen(false);
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  if (!open) return null;

  const slide = MAGAM_ONBOARDING_SLIDES[step];
  const isLast = step >= MAGAM_ONBOARDING_SLIDES.length - 1;

  return (
    <MagamOnboardingBackdrop open={open}>
      <MagamOnboardingCard>
        <MagamOnboardingSlideVisual kind={slide.visual} />
        <div className="px-5 pb-2 pt-4 text-center">
          <p className="text-3xl" aria-hidden>
            {slide.emoji}
          </p>
          <h2 className="mt-2 text-[20px] font-bold tracking-[-0.3px] text-[#141824]">
            {slide.title}
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#5B6472]">{slide.body}</p>
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
            {MAGAM_ONBOARDING_SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-[#2563EB]" : "w-1.5 bg-[#D1D5DB]"
                }`}
              />
            ))}
          </div>
        </div>
        <MagamOnboardingActions
          onSkip={skip}
          onPrimary={() => (isLast ? finish() : setStep((s) => s + 1))}
          primaryLabel={isLast ? MAGAM_ONBOARDING_START : MAGAM_ONBOARDING_NEXT}
          skipLabel={MAGAM_ONBOARDING_SKIP}
        />
      </MagamOnboardingCard>
    </MagamOnboardingBackdrop>
  );
}
