/** 설정 등에 개발·검증 UI 노출 (로컬 `npm run dev` 전용) */
export function showMagamDevTools(): boolean {
  return process.env.NODE_ENV === "development";
}
