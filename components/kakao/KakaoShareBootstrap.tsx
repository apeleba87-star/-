"use client";

import Script from "next/script";

import { getKakaoJavascriptKey, ensureKakaoShareReady } from "@/lib/kakao/sdk";

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";

/** 카카오 인앱에서 공유 버튼 탭 전 SDK를 미리 로드·초기화 */
export default function KakaoShareBootstrap() {
  const key = getKakaoJavascriptKey();
  if (!key) return null;

  return (
    <Script
      id="kakao-sdk"
      src={KAKAO_SDK_URL}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      onLoad={() => {
        void ensureKakaoShareReady();
      }}
    />
  );
}
