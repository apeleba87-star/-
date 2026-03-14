/**
 * 관리자 전용: Supabase에 저장된 면허제한 API 반영 건수 조회.
 * GET → { licenseReflectedCount, tendersWithPrimaryIndustry, sampleTenders, sqlForSupabase }
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const SQL_FOR_SUPABASE = `-- Supabase SQL Editor에서 면허제한 API 반영 건수 확인
-- 1) 면허제한 API로 저장된 업종 수 (tender_industries, match_source = 'detail_api')
SELECT count(*) AS license_reflected_count
FROM tender_industries
WHERE match_source = 'detail_api';

-- 2) primary_industry_code가 있는 입찰 건수 (tenders)
SELECT count(*) AS tenders_with_industry
FROM tenders
WHERE primary_industry_code IS NOT NULL;

-- 3) 최근 면허제한 반영 공고 샘플 (공고번호, 차수, 업종코드, 공고명)
SELECT t.bid_ntce_no, t.bid_ntce_ord, t.primary_industry_code, t.bid_ntce_nm
FROM tenders t
WHERE t.primary_industry_code IS NOT NULL
ORDER BY t.updated_at DESC NULLS LAST
LIMIT 20;
`;

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [licenseRowsRes, tendersRes, sampleRes] = await Promise.all([
      supabase.from("tender_industries").select("tender_id").eq("match_source", "detail_api").limit(2000),
      supabase.from("tenders").select("id", { count: "exact", head: true }).not("primary_industry_code", "is", null),
      supabase
        .from("tenders")
        .select("bid_ntce_no, bid_ntce_ord, primary_industry_code, bid_ntce_nm")
        .not("primary_industry_code", "is", null)
        .order("updated_at", { ascending: false })
        .limit(10),
    ]);

    const uniqueTenderIds = new Set((licenseRowsRes.data ?? []).map((r) => r.tender_id));
    const licenseReflectedCount = uniqueTenderIds.size;
    const tendersWithPrimaryIndustry = tendersRes.count ?? 0;
    const sampleTenders = sampleRes.data ?? [];

    return NextResponse.json({
      licenseReflectedCount,
      tendersWithPrimaryIndustry,
      sampleTenders,
      sqlForSupabase: SQL_FOR_SUPABASE,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
