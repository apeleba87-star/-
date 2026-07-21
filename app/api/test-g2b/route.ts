import { NextResponse } from "next/server";
import { requireAdminEditorApi, isDebugApiAllowed } from "@/lib/api/require-admin-api";
import { safeFetch, G2B_ALLOWED_HOSTS } from "@/lib/safe-fetch";

export const dynamic = "force-dynamic";

/**
 * 나라장터 API 연결 테스트.
 * 프로덕션: admin/editor만. 개발: 로그인 없이 가능.
 */
export async function GET() {
  if (!isDebugApiAllowed()) {
    const auth = await requireAdminEditorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  try {
    const pad = (n: number) => String(n).padStart(2, "0");
    const toYmdHm = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 3);
    const inqryBgnDt = toYmdHm(start);
    const inqryEndDt = toYmdHm(end);
    const url = `https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc?serviceKey=${encodeURIComponent(process.env.DATA_GO_KR_SERVICE_KEY ?? "")}&returnType=json&pageNo=1&numOfRows=5&inqryBgnDt=${inqryBgnDt}&inqryEndDt=${inqryEndDt}&inqryDiv=1`;
    const res = await safeFetch(url, {
      allowedHosts: G2B_ALLOWED_HOSTS,
      timeoutMs: 5000,
      cache: "no-store",
    });
    const text = await res.text();
    const isJson = text.trim().startsWith("{");
    return NextResponse.json({
      status: res.status,
      contentType: res.headers.get("content-type"),
      bodyIsJson: isJson,
      bodyPreview: text.slice(0, 500),
      keySet: !!process.env.DATA_GO_KR_SERVICE_KEY,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
