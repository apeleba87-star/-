/** 설정 등에 개발·검증 UI 노출 (로컬 또는 Vercel env) */
export function showMagamDevTools(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_MAGAM_DEV_TOOLS === "1"
  );
}
