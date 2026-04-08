import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getTenderKeywordOptionsByCategory } from "@/lib/g2b/keywords";
import { DATA_GO_KR_SCSBID_SERVICE_KEY_ENV } from "@/lib/g2b/scsbid-client";
import {
  runScsbidAwardRawIngest,
  TENDER_AWARD_RAW_SOURCE_SCSBID_LIST_STTUS_SERVC,
} from "@/lib/g2b/scsbid-award-ingest";
import {
  getScsbidAwardDefaultLookbackMinutes,
  SCSBID_AWARD_ADMIN_MAX_LOOKBACK_MINUTES,
} from "@/lib/g2b/scsbid-ingest-window";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdminEditor(): Promise<
  | { ok: true }
  | { ok: false; status: number; body: { ok: false; error: string } }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, body: { ok: false, error: "Unauthorized" } };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false, status: 403, body: { ok: false, error: "Forbidden" } };
  }
  return { ok: true };
}

function parseBoundedInt(v: string | null, fallback: number, min: number, max: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** GET: tender_award_raw 건수(서울 낙찰 소스). 관리자·편집자만. */
export async function GET() {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  try {
    const service = createServiceSupabase();
    const [totalRes, scsbidRes] = await Promise.all([
      service.from("tender_award_raw").select("*", { count: "exact", head: true }),
      service
        .from("tender_award_raw")
        .select("*", { count: "exact", head: true })
        .eq("source_slug", TENDER_AWARD_RAW_SOURCE_SCSBID_LIST_STTUS_SERVC),
    ]);
    return NextResponse.json({
      ok: true,
      totalCount: totalRes.count ?? 0,
      scsbidListSttusServcCount: scsbidRes.count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: message.includes("SUPABASE_SERVICE_ROLE_KEY")
          ? "SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
          : message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Scsbid 용역 낙찰 원천 수집.
 * 쿼리: maxRows (기본 2500, 최대 20000), pageSize (기본 100, 최대 999),
 * lookbackMinutes (기본 환경/250분, 최대 60일 = SCSBID_AWARD_ADMIN_MAX_LOOKBACK_MINUTES)
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  if (!process.env.DATA_GO_KR_SCSBID_SERVICE_KEY?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: `${DATA_GO_KR_SCSBID_SERVICE_KEY_ENV}가 없습니다. 낙찰정보서비스(ScsbidInfo)용 인증키를 넣으세요.`,
      },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const url = req.nextUrl;
  const maxRows = parseBoundedInt(url.searchParams.get("maxRows"), 2500, 1, 20000);
  const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 100, 1, 999);
  const lookbackMinutes = parseBoundedInt(
    url.searchParams.get("lookbackMinutes"),
    getScsbidAwardDefaultLookbackMinutes(),
    30,
    SCSBID_AWARD_ADMIN_MAX_LOOKBACK_MINUTES
  );

  const optionsByCategory = await getTenderKeywordOptionsByCategory();
  const result = await runScsbidAwardRawIngest({
    supabase,
    optionsByCategory,
    lookbackMinutes,
    pageSize,
    maxRowsPerRun: maxRows,
  });

  return NextResponse.json({
    ok: result.ok,
    scsbid: {
      pages: result.pages,
      rowsWritten: result.rowsWritten,
      totalCount: result.totalCount,
      lastResultCode: result.lastResultCode,
      inqryBgnDt: result.inqryBgnDt,
      inqryEndDt: result.inqryEndDt,
      error: result.error,
    },
  });
}
