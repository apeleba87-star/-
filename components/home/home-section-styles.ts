/**
 * 홈 화면 UI — 히어로 스크린샷 기준: 흰 카드 셸, 블루→바이올렛 그라데이션 포인트, zinc 타이포
 */

/** 히어로와 동일 톤의 메인 서피스 카드 */
export const homeSurfaceCardClass =
  "rounded-[1.75rem] border border-zinc-200/60 bg-white shadow-[0_24px_48px_-28px_rgba(24,24,27,0.18)] sm:rounded-[2rem]";

/** 카드 내부 은은한 그라데이션 (히어로 하단과 동조) */
export const homeSurfaceCardInnerClass =
  "bg-gradient-to-b from-white via-white to-violet-100/30";

/** 목록/카드용 리스트 아이템 */
export const homeCardClass =
  "rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.02] transition-shadow hover:shadow-md";

export const homeDashboardCardClass =
  "rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm ring-1 ring-zinc-950/[0.02] transition-shadow hover:shadow-md";

/** 섹션 타이틀 옆 아이콘 — 단색 (레거시). 신규는 homeSectionIconGradientBox 사용 */
export const homeSectionIconBox =
  "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md";

/** 스크린샷과 동일: 그라데이션 아이콘 박스 */
export const homeSectionIconGradientBox =
  "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20";

/** 섹션 하단 전체 보기 — 히어로 CTA와 동일 그라데이션 */
export const homeFooterBtnPrimaryClass =
  "mt-5 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-blue-500 hover:via-violet-500 hover:to-purple-500";

/** 보조 푸터 링크 (테두리) */
export const homeFooterBtnSecondaryClass =
  "mt-3 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50";

/** 레거시 회색 푸터 버튼 — 홈에서는 primary로 대체 권장 */
export const homeFooterBtnClass =
  "mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-zinc-100 py-3.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200/90";

/** 섹션 간격 */
export const homeSectionSpacing = "mb-10";
