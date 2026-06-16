/** 안내 오버레이 중 배경 스크롤 방지 (iOS 포함) */
export function lockPageScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  const scrollY = window.scrollY;
  const body = document.body;
  const prev = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    touchAction: body.style.touchAction,
  };

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";
  body.style.touchAction = "none";

  return () => {
    body.style.overflow = prev.overflow;
    body.style.position = prev.position;
    body.style.top = prev.top;
    body.style.width = prev.width;
    body.style.touchAction = prev.touchAction;
    window.scrollTo(0, scrollY);
  };
}

export function preventBackgroundScrollWhileOverlay(active: boolean): () => void {
  if (typeof document === "undefined" || !active) return () => {};

  const allowScroll = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest("[data-magam-onboarding-scroll]");

  const onTouchMove = (e: TouchEvent) => {
    if (allowScroll(e.target)) return;
    e.preventDefault();
  };

  const onWheel = (e: WheelEvent) => {
    if (allowScroll(e.target)) return;
    e.preventDefault();
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("wheel", onWheel);
  };
}

/** @deprecated use preventBackgroundScrollWhileOverlay */
export const preventTouchScrollWhileLocked = preventBackgroundScrollWhileOverlay;
