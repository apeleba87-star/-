/**
 * 관리자 전용: 면허제한 API 1건 호출 테스트.
 * GET ?bidNtceNo=공고번호&bidNtceOrd=00 → API 원문 + 파싱된 업종 코드(1162 등) 반환.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBidPblancListInfoLicenseLimit, extractItems } from "@/lib/g2b/client";
import { parseIndustryRestrictionsFromDetailResponse } from "@/lib/g2b/industry-from-detail";
import type { IndustryRow } from "@/lib/g2b/industry-from-raw";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ ok: false, error: "bidNtceNo 쿼리 필요 (예: ?bidNtceNo=R26BK01393967-000)" }, { status: 400 });
  }
  const bidNtceOrd = req.nextUrl.searchParams.get("bidNtceOrd")?.trim() || "00";

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

  const callApi = () => getBidPblancListInfoLicenseLimit({ bidNtceNo, bidNtceOrd });

  try {
    let data: Awaited<ReturnType<typeof getBidPblancListInfoLicenseLimit>>;
    try {
      data = await callApi();
    } catch (first: unknown) {
      const msg = first instanceof Error ? first.message : String(first);
      if (msg.includes("429")) {
        await new Promise((r) => setTimeout(r, 10000));
        data = await callApi();
      } else {
        throw first;
      }
    }
    const items = extractItems(data);
    const rawForParser = data as unknown as Record<string, unknown>;
    const matches = parseIndustryRestrictionsFromDetailResponse(rawForParser, industries);
    const codes = [...new Set(matches.map((m) => m.code))];

    const body = (data as { response?: { body?: unknown } }).response?.body ?? data;
    return NextResponse.json({
      ok: true,
      bidNtceNo,
      bidNtceOrd,
      raw: body,
      itemsCount: Array.isArray(items) ? items.length : 1,
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
