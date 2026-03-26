"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { buildTendersSearchParams } from "@/lib/tenders/user-focus";
import type { UserTenderFocusRow } from "@/lib/tenders/user-focus";
import { TENDER_FOCUS_UPDATED_EVENT } from "@/lib/tenders/tender-focus-events";

function focusLabel(f: Pick<UserTenderFocusRow, "region_sido" | "region_gugun" | "industry_codes">): string {
  const parts: string[] = [];
  if (f.region_sido) {
    parts.push(f.region_gugun ? `${f.region_sido} ${f.region_gugun}` : f.region_sido);
  } else {
    parts.push("전국");
  }
  const n = (f.industry_codes ?? []).length;
  if (n > 0) parts.push(`업종 ${n}개`);
  return parts.join(" · ");
}

export default function TenderFocusNavChip() {
  const pathname = usePathname();
  const [focus, setFocus] = useState<UserTenderFocusRow | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setFocus(null);
        return;
      }
      const { data, error } = await supabase
        .from("user_tender_focus")
        .select("user_id, region_sido, region_gugun, industry_codes, updated_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled) setFocus(error ? null : ((data as UserTenderFocusRow | null) ?? null));
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    const onUpdated = () => load();
    window.addEventListener(TENDER_FOCUS_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener(TENDER_FOCUS_UPDATED_EVENT, onUpdated);
    };
  }, [pathname]);

  if (focus === undefined || focus === null) return null;

  const href =
    "/tenders" +
    buildTendersSearchParams({
      industryCodes: focus.industry_codes ?? [],
      regionSido: focus.region_sido,
      regionGugun: focus.region_gugun,
    });

  return (
    <Link
      href={href || "/tenders"}
      className="hidden max-w-[200px] items-center gap-1.5 truncate rounded-full border border-teal-200/90 bg-teal-50/90 px-2.5 py-1 text-xs font-semibold text-teal-900 shadow-sm hover:bg-teal-100/90 lg:inline-flex"
      title="저장된 내 관심으로 입찰 목록 열기"
    >
      <Bookmark className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
      <span className="truncate">내 관심 · {focusLabel(focus)}</span>
    </Link>
  );
}
