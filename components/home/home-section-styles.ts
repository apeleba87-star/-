/**
 * 첫 홈 일괄성 있는 UI — 카드·버튼·섹션 헤더 스타일 통일
 *
 * 섹션 헤더 패턴 (입찰/뉴스/인사이트):
 * - 아이콘: homeSectionIconBox + 색상(bg-blue-500 등)
 * - 제목: text-xl font-bold text-slate-900
 * - 요약: mt-0.5 text-xs text-slate-500
 */

/** 목록/카드용 공통 카드 (입찰·뉴스·인사이트 리스트 아이템) */
export const homeCardClass =
  "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md";

/** 대시보드 요약 카드 (상단 6칸) — 리스트 카드와 테두리/배경 동일, 패딩만 p-5 */
export const homeDashboardCardClass =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md";

/** 섹션 헤더 아이콘 박스 (h-10 w-10 rounded-xl, 아이콘 색상은 별도 지정) */
export const homeSectionIconBox =
  "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm";

/** 섹션 하단 "전체 보기" 버튼 공통 */
export const homeFooterBtnClass =
  "mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-slate-100 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200";

/** 섹션 간격 (아래 여백) */
export const homeSectionSpacing = "mb-10";
