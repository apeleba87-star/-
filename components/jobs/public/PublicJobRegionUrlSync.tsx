"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { jobPublicDraftFromSearchParams } from "@/lib/jobs-public/share-metadata";

/** 공유 링크(?scope=…)로 들어오면 쿠키에 지역 저장 */
export default function PublicJobRegionUrlSync() {
  const searchParams = useSearchParams();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    const raw = Object.fromEntries(searchParams?.entries() ?? []);
    const draft = jobPublicDraftFromSearchParams(raw);
    if (!draft) return;
    synced.current = true;
    void fetch("/api/jobs-public/region", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
  }, [searchParams]);

  return null;
}
