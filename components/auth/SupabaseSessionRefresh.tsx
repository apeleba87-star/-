"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/**
 * OAuth/매직링크 직후 첫 페인트에서 서버 컴포넌트가 아직 세션 쿠키를 반영하지 못하는 경우가 있어,
 * 브라우저 클라이언트로 세션을 한 번 읽은 뒤 RSC를 갱신합니다.
 * (루트 레이아웃은 클라이언트 네비게이션 시 언마운트되지 않으므로 탭당 1회만 실행됩니다.)
 */
export default function SupabaseSessionRefresh() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.refresh();
      }
    })();
  }, [router]);

  return null;
}
