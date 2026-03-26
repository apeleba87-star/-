/** 헤더 칩 등에서 내 관심 저장/해제 후 동기화 */
export const TENDER_FOCUS_UPDATED_EVENT = "tender-focus-updated";

export function dispatchTenderFocusUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TENDER_FOCUS_UPDATED_EVENT));
  }
}
