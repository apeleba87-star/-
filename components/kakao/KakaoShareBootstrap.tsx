"use client";

import { useEffect } from "react";
import { isKakaoInAppBrowser } from "@/lib/kakao/detect";
import { ensureKakaoShareReady, getKakaoJavascriptKey } from "@/lib/kakao/sdk";

/** 카카오 인앱에서 공유 버튼 탭 전 SDK를 미리 로드 */
export default function KakaoShareBootstrap() {
  useEffect(() => {
    if (!isKakaoInAppBrowser() || !getKakaoJavascriptKey()) return;
    void ensureKakaoShareReady();
  }, []);

  return null;
}
