import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { runTenderFetch } from "@/lib/g2b/fetch-tenders";

export const dynamic = "force-dynamic";
/** 수집이 오래 걸릴 수 있으므로 타임아웃 5분 (Vercel Pro 등에서 적용) */
export const maxDuration = 300;

/**
 * 관리자 전용: 나라장터(G2B) 입찰 수집 수동 실행
 * - 로그인 + admin/editor 권한 필요
 * - ?stream=1 이면 NDJSON 스트리밍 응답 (진행률 실시간)
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "DATA_GO_KR_SERVICE_KEY가 .env.local에 없습니다. 공공데이터포털에서 인증키(Encoding) 복사 후 추가하세요.",
    }, { status: 400 });
  }

  const stream = new URL(req.url).searchParams.get("stream") === "1";
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };
        try {
          const result = await runTenderFetch({
            daysBack: 1,
            onProgress: (p) => send({ type: "progress", ...p }),
          });
          if (result.ok) {
            revalidatePath("/tenders");
            revalidatePath("/");
          }
          const errStr =
            result.ok ? undefined
            : typeof result.error === "string" && result.error.trim()
              ? result.error.trim()
              : result.error != null
                ? String(result.error)
                : "수집 실패. 원인을 확인할 수 없습니다.";
          send({
            type: "complete",
            ok: result.ok,
            tenders: result.tenders,
            inserted: result.inserted,
            updated: result.updated,
            licenseReflected: result.licenseReflected,
            listApiMatchedCount: result.listApiMatchedCount,
            ppssrchMatchedCount: result.ppssrchMatchedCount,
            licenseRawCount: result.licenseRawCount,
            licenseError: result.licenseError,
            licenseKeys: result.licenseKeys,
            matchedLicenseKeys: result.matchedLicenseKeys,
            listKeys: result.listKeys,
            error: errStr,
          });
        } catch (e) {
          const message =
            e instanceof Error ? e.message
            : typeof (e as { message?: string })?.message === "string"
              ? (e as { message: string }).message
              : String(e);
          send({ type: "complete", ok: false, error: message || "수집 중 예외 발생", tenders: 0, inserted: 0, updated: 0, licenseReflected: 0 });
        } finally {
          controller.close();
        }
      },
    });
    return new NextResponse(readable, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  try {
    const result = await runTenderFetch({ daysBack: 1 });
    let errorMsg: string | undefined;
    if (!result.ok) {
      const raw = result.error;
      if (typeof raw === "string" && raw.trim()) {
        errorMsg = raw.trim();
      } else if (raw != null && typeof raw === "object" && "message" in raw && typeof (raw as { message: unknown }).message === "string") {
        errorMsg = (raw as { message: string }).message;
      } else if (raw != null) {
        try {
          const s = typeof raw === "string" ? raw : JSON.stringify(raw);
          errorMsg = s && s !== "{}" ? `수집 실패: ${s}` : "수집 실패. 원인을 확인할 수 없습니다.";
        } catch {
          errorMsg = "수집 실패. 원인을 확인할 수 없습니다.";
        }
      } else {
        errorMsg = "수집 실패. 원인을 확인할 수 없습니다.";
      }
    }
    if (result.ok) {
      revalidatePath("/tenders");
      revalidatePath("/");
    }
    return NextResponse.json({
      ok: result.ok,
      tenders: result.tenders,
      inserted: result.inserted,
      updated: result.updated,
      licenseReflected: result.licenseReflected,
      listApiMatchedCount: result.listApiMatchedCount,
      ppssrchMatchedCount: result.ppssrchMatchedCount,
      licenseRawCount: result.licenseRawCount,
      licenseError: result.licenseError,
      licenseKeys: result.licenseKeys,
      matchedLicenseKeys: result.matchedLicenseKeys,
      listKeys: result.listKeys,
      error: errorMsg,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
