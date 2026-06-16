/** 카카오톡·다음 인앱 브라우저 여부 */
export function isKakaoInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const ref = (document.referrer || "").toLowerCase();
  return /kakao|daum|kakaotalk/.test(ua) || /kakao|daum|kakaotalk/.test(ref);
}
