import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runSeoulOpenApiGetJobInfoIngest } from "@/lib/jobs-public-ingest/run-seoul-openapi-ingest";
import { JOB_OPEN_DATA_SOURCE_SEOUL_GET_JOB_INFO } from "@/lib/jobs-public-ingest/source-slugs";
import type { SeoulResponseFormat } from "@/lib/jobs-public-ingest/seoul/fetch-get-job-info";

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

/**
 * GET: job_open_data_raw 건수(서비스 롤). 관리자·편집자만.
 */
export async function GET() {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  try {
    const service = createServiceSupabase();
    const [totalRes, seoulRes] = await Promise.all([
      service.from("job_open_data_raw").select("*", { count: "exact", head: true }),
      service
        .from("job_open_data_raw")
        .select("*", { count: "exact", head: true })
        .eq("source_slug", JOB_OPEN_DATA_SOURCE_SEOUL_GET_JOB_INFO),
    ]);
    return NextResponse.json({
      ok: true,
      totalCount: totalRes.count ?? 0,
      seoulGetJobInfoCount: seoulRes.count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "SUPABASE_SERVICE_ROLE_KEY가 필요합니다." : message },
      { status: 500 }
    );
  }
}

/**
 * POST: 서울 열린데이터 GetJobInfo 원천 수집. 관리자·편집자만.
 * 쿼리: maxRows (기본 1500, 최대 10000), pageSize (기본 500, 최대 1000), format=xml|json
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const apiKey = process.env.SEOUL_OPEN_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "SEOUL_OPEN_API_KEY가 설정되어 있지 않습니다. .env.local에 서울 열린데이터 인증키를 추가하세요.",
      },
      { status: 400 }
    );
  }

  let service;
  try {
    service = createServiceSupabase();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const url = req.nextUrl;
  const maxRows = parseBoundedInt(url.searchParams.get("maxRows"), 1500, 1, 10_000);
  const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 500, 1, 1000);
  const formatParam = url.searchParams.get("format");
  const responseFormat: SeoulResponseFormat = formatParam === "json" ? "json" : "xml";
  const baseUrl = process.env.SEOUL_OPEN_API_BASE_URL?.trim() || undefined;

  const result = await runSeoulOpenApiGetJobInfoIngest({
    supabase: service,
    apiKey,
    baseUrl,
    responseFormat,
    pageSize,
    maxRowsPerRun: maxRows,
  });

  return NextResponse.json({
    ok: result.ok,
    seoul: {
      pages: result.pages,
      rowsWritten: result.rowsWritten,
      listTotalCount: result.listTotalCount,
      lastResultCode: result.lastResultCode,
      error: result.error,
    },
  });
}
