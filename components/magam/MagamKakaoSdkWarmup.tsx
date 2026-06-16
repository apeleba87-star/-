"use client";

import { useEffect } from "react";

import { ensureKakaoShareReady } from "@/lib/kakao/sdk";

/** 마감링크 진입 시 카카오 SDK 미리 로드 — 공유 버튼 클릭 직후 피커가 열리도록 */
export default function MagamKakaoSdkWarmup() {
  useEffect(() => {
    void ensureKakaoShareReady();
  }, []);

  return null;
}
