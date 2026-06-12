import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { jobPublicScopeFromDraft } from "@/lib/jobs-public/job-region-scope";
import {
  fetchPublicJobList,
  filterLocalJobs,
} from "@/lib/jobs-public/queries";
import { isNationalPublicJobScope, preferenceFromScope } from "@/lib/jobs-public/region-preference-shared";
import { sortPublicJobList } from "@/lib/jobs-public/public-job-sort";
import {
  buildPublicJobsShareHeadline,
  parseJobPublicShareRegionFromSearchParams,
} from "@/lib/jobs-public/share-metadata";
import { createClient } from "@/lib/supabase-server";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

function paramsFromUrl(searchParams: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export async function GET(req: NextRequest) {
  const raw = paramsFromUrl(req.nextUrl.searchParams);
  const pref =
    parseJobPublicShareRegionFromSearchParams(raw) ??
    preferenceFromScope(jobPublicScopeFromDraft({ scope: "city", cityId: "seoul" }));

  let localCount = 0;
  let localPay = null;
  let nationalPay = null;

  try {
    const supabase = createClient();
    const allJobs = await fetchPublicJobList(supabase, { fetchAll: true });
    const scopedJobs = filterLocalJobs(allJobs, pref);
    localCount = scopedJobs.length;
    nationalPay = sortPublicJobList(allJobs, "pay")[0] ?? null;
    localPay = isNationalPublicJobScope(pref)
      ? nationalPay
      : sortPublicJobList(scopedJobs, "pay")[0] ?? null;
  } catch {
    // text-only fallback
  }

  const { headline, payLine, regionShort } = buildPublicJobsShareHeadline({
    pref,
    localPay,
    nationalPay,
  });
  const countLabel =
    localCount > 0 ? `공고 ${localCount.toLocaleString("ko-KR")}건` : "청소·미화·용역";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 45%, #2563eb 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.9 }}>클린아이덱스 · 채용</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            {headline}
          </div>
          {payLine ? (
            <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.04em" }}>{payLine}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.95 }}>
            {regionShort} · {countLabel}
          </div>
          <div style={{ fontSize: 22, opacity: 0.75 }}>급여 높은순 · 시급·월급 비교</div>
        </div>
      </div>
    ),
    SIZE
  );
}
