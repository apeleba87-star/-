"use client";

import { useEffect } from "react";

type Props = {
  companyId: string;
};

const storageKey = (companyId: string) => `partner_detail_tracked_v1_${companyId}`;

/**
 * 같은 브라우저 탭 세션에서는 상세 조회 이벤트를 한 번만 보냅니다(새로고침 반복 집계 방지).
 * 서버에서는 동일 방문자·업체당 한국 날짜 기준 하루 1회만 detail_view를 저장합니다.
 */
export default function PartnerDetailViewTracker({ companyId }: Props) {
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const k = storageKey(companyId);
    if (sessionStorage.getItem(k)) return;

    void fetch("/api/partners/contact", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company_id: companyId,
        event_type: "detail_view",
      }),
    })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(k, "1");
      })
      .catch(() => undefined);
  }, [companyId]);

  return null;
}
