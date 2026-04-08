import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import TenderAwardListCard, { type TenderAwardListRow } from "@/components/tender/TenderAwardListCard";
import TenderAwardsFilters from "./TenderAwardsFilters";
import { buildTenderAwardsSearchParams } from "@/lib/tenders/tender-awards-url";
import { resolveTenderIdsForAwardFilter } from "@/lib/tenders/tender-awards-filter";
import {
  normalizeIndustryCodes,
  parseGugunParam,
  isValidSido,
} from "@/lib/tenders/user-focus";
import TenderAwardsCollectNote from "./TenderAwardsCollectNote";

export const revalidate = 60;

const PAGE_SIZE = 50;

const AWARD_LIST_COLUMNS =
  "id,tender_id,bid_ntce_no,bid_ntce_ord,bid_ntce_nm,openg_dt,sucsfbider_nm,sucsfbid_amt,presmpt_prce,bid_rate_pct,competition_summary,rate_band,is_clean_related" as const;

const AWARD_SORT_OPTIONS = ["openg", "openg-old", "amount-high", "amount-low"] as const;
type AwardSortId = (typeof AWARD_SORT_OPTIONS)[number];

const REGION_OPTIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

type SearchParams = Promise<{
  industry?: string;
  region?: string;
  gugun?: string;
  sort?: string;
  page?: string;
}>;

function filterParamsForPagination(opts: {
  industryCodes: string[];
  regionSido: string | null;
  regionGugun: string | null;
  sort: AwardSortId;
  page: number;
}): string {
  return buildTenderAwardsSearchParams({
    industryCodes: opts.industryCodes,
    regionSido: opts.regionSido,
    regionGugun: opts.regionGugun,
    sort: opts.sort !== "openg" ? opts.sort : undefined,
    page: opts.page > 1 ? opts.page : undefined,
  });
}

export default async function TenderAwardsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const industryCodes = normalizeIndustryCodes(
    (params.industry ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const region =
    params.region?.trim() && REGION_OPTIONS.includes(params.region as (typeof REGION_OPTIONS)[number])
      ? params.region
      : null;
  const gugun = parseGugunParam(region, params.gugun?.trim() ?? null);

  const sort: AwardSortId = AWARD_SORT_OPTIONS.includes((params.sort ?? "openg") as AwardSortId)
    ? (params.sort as AwardSortId)
    : "openg";

  const pageRaw = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const supabase = createClient();

  const industriesRes = await supabase
    .from("industries")
    .select("code, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  const industries = (industriesRes.data ?? []) as { code: string; name: string }[];

  let tenderIds: string[] | null = null;
  try {
    tenderIds = await resolveTenderIdsForAwardFilter(supabase, {
      industryCodes,
      regionSido: isValidSido(region) ? region : null,
      regionGugun: gugun,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20">
        <div className="page-shell py-10 lg:py-12">
          <h1 className="mb-4 text-3xl font-bold text-slate-900">낙찰·개찰 요약</h1>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{msg}</div>
        </div>
      </div>
    );
  }

  if (tenderIds !== null && tenderIds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20">
        <div className="page-shell py-10 lg:py-12">
          <header className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-slate-900">낙찰·개찰 요약</h1>
            <p className="max-w-2xl text-slate-600">
              나라장터 낙찰정보(용역)를 바탕으로 한 개찰·낙찰 요약입니다. 입찰 공고 목록과는 별도로, 마감된 건의 결과를
              빠르게 훑을 수 있습니다.
            </p>
            <TenderAwardsCollectNote />
          </header>
          <TenderAwardsFilters
            industries={industries}
            initialIndustryCodes={industryCodes}
            initialRegion={region ?? "전체 지역"}
            initialGugun={gugun ?? ""}
            initialSort={sort}
          />
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            선택한 업종·지역에 해당하는 입찰 공고가 없어 낙찰 요약을 표시할 수 없습니다.
          </p>
          <p className="mt-10 text-center text-sm text-slate-500">
            <Link href="/tenders" className="font-medium text-blue-600 hover:underline">
              입찰 공고 목록
            </Link>
            으로 이동
          </p>
        </div>
      </div>
    );
  }

  let countQ = supabase
    .from("tender_award_summaries")
    .select("*", { count: "exact", head: true });
  if (tenderIds != null) {
    countQ = countQ.in("tender_id", tenderIds);
  }

  const { count, error: countError } = await countQ;

  if (countError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20">
        <div className="page-shell py-10 lg:py-12">
          <h1 className="mb-4 text-3xl font-bold text-slate-900">낙찰·개찰 요약</h1>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            목록을 불러오지 못했습니다. 마이그레이션 적용 여부를 확인하세요. ({countError.message})
          </div>
        </div>
      </div>
    );
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageRaw, totalPages);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let dataQ = supabase.from("tender_award_summaries").select(AWARD_LIST_COLUMNS);
  if (tenderIds != null) {
    dataQ = dataQ.in("tender_id", tenderIds);
  }

  if (sort === "amount-high") {
    dataQ = dataQ
      .order("sucsfbid_amt", { ascending: false, nullsFirst: true })
      .order("openg_dt", { ascending: false, nullsFirst: true });
  } else if (sort === "amount-low") {
    dataQ = dataQ
      .order("sucsfbid_amt", { ascending: true, nullsFirst: true })
      .order("openg_dt", { ascending: false, nullsFirst: true });
  } else if (sort === "openg-old") {
    dataQ = dataQ.order("openg_dt", { ascending: true, nullsFirst: true });
  } else {
    dataQ = dataQ.order("openg_dt", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await dataQ.range(from, to);

  const rows = (data ?? []) as TenderAwardListRow[];

  const regionLabel = region ?? "전체 지역";
  const filterBase = {
    industryCodes,
    regionSido: isValidSido(region) ? region : null,
    regionGugun: gugun,
    sort,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20">
      <div className="page-shell py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">낙찰·개찰 요약</h1>
          <p className="max-w-2xl text-slate-600">
            나라장터 낙찰정보(용역)를 바탕으로 한 개찰·낙찰 요약입니다. 입찰 공고와 같은 업종·지역 필터로 좁힐 수
            있습니다. 마감된 건의 낙찰금액·개찰일 등은 수집 시점 API 필드와 연결된 공고 정보를 함께 반영합니다.
          </p>
          <TenderAwardsCollectNote />
        </header>

        <TenderAwardsFilters
          industries={industries}
          initialIndustryCodes={industryCodes}
          initialRegion={regionLabel}
          initialGugun={gugun ?? ""}
          initialSort={sort}
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            목록을 불러오지 못했습니다. ({error.message})
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            표시할 낙찰 요약이 없습니다. 수집 크론 실행 후 다시 확인하거나, 필터를 넓혀 보세요.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">
              총 <strong className="text-slate-800">{total.toLocaleString("ko-KR")}</strong>건 중{" "}
              {from + 1}–{Math.min(to + 1, total)}번째
            </p>
            <ul className="space-y-4">
              {rows.map((row) => (
                <li key={row.id}>
                  <TenderAwardListCard row={row} />
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="페이지">
                {page > 1 ? (
                  <Link
                    href={`/tender-awards${filterParamsForPagination({ ...filterBase, page: page - 1 })}`}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    이전
                  </Link>
                ) : (
                  <span className="rounded-lg border border-slate-100 px-4 py-2 text-sm text-slate-400">이전</span>
                )}
                <span className="px-2 text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/tender-awards${filterParamsForPagination({ ...filterBase, page: page + 1 })}`}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    다음
                  </Link>
                ) : (
                  <span className="rounded-lg border border-slate-100 px-4 py-2 text-sm text-slate-400">다음</span>
                )}
              </nav>
            )}
          </>
        )}

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link href="/tenders" className="font-medium text-blue-600 hover:underline">
            입찰 공고 목록
          </Link>
          으로 이동
        </p>
      </div>
    </div>
  );
}
