/**
 * 관리자 전용: 면허제한 API 1건 테스트.
 * API는 공고번호로 필터하지 않고 7일 구간 전체 목록을 반환하므로, 구간 조회 후 페이지를 돌며 해당 공고만 찾아 반환.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBidPblancListInfoLicenseLimitByRange, extractItems } from "@/lib/g2b/client";
import { parseIndustryRestrictionsFromDetailResponse } from "@/lib/g2b/industry-from-detail";
import type { IndustryRow } from "@/lib/g2b/industry-from-raw";

export const dynamic = "force-dynamic";

const normOrd = (v: unknown) => String(v ?? "").replace(/\D/g, "").padStart(2, "0");

function get7DayRange(): { inqryBgnDt: string; inqryEndDt: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    inqryBgnDt: `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}0000`,
    inqryEndDt: `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}2359`,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const bidNtceNo = req.nextUrl.searchParams.get("bidNtceNo")?.trim();
  if (!bidNtceNo) {
    return NextResponse.json({ ok: false, error: "bidNtceNo 쿼리 필요 (예: ?bidNtceNo=R26BK01393703)" }, { status: 400 });
  }
  const bidNtceOrd = req.nextUrl.searchParams.get("bidNtceOrd")?.trim() || "00";
  const wantNo = bidNtceNo.replace(/-000$/, "");

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, aliases, group_key, sort_order")
    .eq("is_active", true);
  const industries: IndustryRow[] = (industryRows ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    aliases: r.aliases ?? undefined,
    group_key: r.group_key ?? undefined,
    sort_order: r.sort_order ?? 0,
  }));

  try {
    const range = get7DayRange();
    let foundItems: Record<string, unknown>[] = [];
    const maxPages = 200;
    for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
      const data = await getBidPblancListInfoLicenseLimitByRange({
        ...range,
        pageNo,
        numOfRows: 100,
      });
      const items = extractItems(data);
      const forNotice = items.filter(
        (it: Record<string, unknown>) =>
          String(it?.bidNtceNo ?? "").replace(/-/g, "") === wantNo.replace(/-/g, "") && normOrd(it?.bidNtceOrd) === bidNtceOrd
      );
      if (forNotice.length > 0) {
        foundItems = forNotice;
        break;
      }
      if (items.length === 0) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    const rawForParser = { response: { body: { items: { item: foundItems } } } };
    const matches = parseIndustryRestrictionsFromDetailResponse(rawForParser as unknown as Record<string, unknown>, industries);
    const codes = [...new Set(matches.map((m) => m.code))];

    return NextResponse.json({
      ok: true,
      bidNtceNo,
      bidNtceOrd,
      raw: foundItems.length ? { items: foundItems } : { message: "해당 공고를 7일 구간 목록에서 찾지 못함. 구간 내 다른 순서에 있을 수 있음." },
      itemsCount: foundItems.length,
      parsed: {
        codes,
        matches: matches.map((m) => ({ code: m.code, raw_value: m.raw_value, match_source: m.match_source })),
      },
      has1162: codes.includes("1162"),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message, bidNtceNo, bidNtceOrd }, { status: 200 });
  }
}
