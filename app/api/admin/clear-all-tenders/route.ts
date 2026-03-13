import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 500;

/**
 * 관리자 전용: DB에 저장된 입찰 공고 전체 삭제 + 수집 체크포인트 초기화.
 * 대량일 때 타임아웃 방지를 위해 배치로 삭제.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" && profile?.role !== "editor") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    let service;
    try {
      service = createServiceSupabase();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { ok: false, error: msg.includes("SERVICE_ROLE") ? "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Vercel/로컬 환경변수를 확인하세요." : msg },
        { status: 500 }
      );
    }

    let deletedTenders = 0;
    for (;;) {
      const { data: ids, error: fetchErr } = await service
        .from("tenders")
        .select("id")
        .limit(BATCH_SIZE);
      if (fetchErr) {
        return NextResponse.json({ ok: false, error: `tenders 조회 실패: ${fetchErr.message}` }, { status: 500 });
      }
      if (!ids?.length) break;
      const idList = ids.map((r) => r.id);
      const { error: deleteErr } = await service.from("tenders").delete().in("id", idList);
      if (deleteErr) {
        return NextResponse.json({ ok: false, error: `tenders 삭제 실패: ${deleteErr.message}` }, { status: 500 });
      }
      deletedTenders += idList.length;
    }

    const { error: deleteCheckpointsErr } = await service
      .from("g2b_fetch_checkpoints")
      .delete()
      .not("operation", "is", null);
    if (deleteCheckpointsErr) {
      return NextResponse.json(
        { ok: false, error: `체크포인트 초기화 실패: ${deleteCheckpointsErr.message}` },
        { status: 500 }
      );
    }

    revalidatePath("/tenders");
    revalidatePath("/admin/industries");
    return NextResponse.json({
      ok: true,
      deleted_tenders: deletedTenders,
      message: `입찰 공고 ${deletedTenders}건 삭제 및 수집 체크포인트 초기화 완료. API 수집을 다시 실행하면 됩니다.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
