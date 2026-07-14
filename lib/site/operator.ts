/** 사이트 운영자(사업자) 정보 — AdSense·전자상거래 표기용 */

export const SITE_OPERATOR = {
  tradeName: "맨즈컴퍼니",
  ceoName: "한승필",
  businessNumber: "520-52-00347",
  phoneDisplay: "010-2521-8915",
  phoneTel: "01025218915",
  /** 공항동은 강서구 — 입력값 '강석두'를 강서구로 교정 */
  address: "서울특별시 강서구 공항동 1335-4 201호",
  serviceName: "클린아이덱스",
} as const;

export function operatorSupportEmail(): string {
  return (
    process.env.MAGAM_SUPPORT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_MAGAM_SUPPORT_EMAIL?.trim() ||
    "apeleba2@naver.com"
  );
}
