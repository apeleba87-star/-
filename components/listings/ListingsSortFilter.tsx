"use client";

import { useRouter, usePathname } from "next/navigation";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "recommended", label: "추천 매물" },
  { value: "newest", label: "최신순" },
  { value: "monthly_high", label: "월수금 높은순" },
  { value: "monthly_low", label: "월수금 낮은순" },
  { value: "deal_high", label: "매매가 높은순" },
  { value: "deal_low", label: "매매가 낮은순" },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체 유형" },
  { value: "sale_regular", label: "정기 매매" },
  { value: "referral_regular", label: "정기 소개" },
  { value: "referral_one_time", label: "일회 소개" },
  { value: "subcontract", label: "도급" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "open", label: "진행 중" },
  { value: "closed", label: "마감됨" },
  { value: "all", label: "전체" },
];

const VISITS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "1", label: "주 1회" },
  { value: "2", label: "주 2회" },
  { value: "3", label: "주 3회" },
  { value: "4", label: "주 4회" },
  { value: "5", label: "주 5회" },
  { value: "6", label: "주 6회" },
  { value: "7", label: "주 7회" },
];

type Props = {
  currentSort: string;
  currentType: string | null;
  currentStatus: string;
  currentRegion: string | null;
  currentCategory: string | null;
  currentVisits: number | null;
  regionSidoOptions: { value: string; label: string }[];
  regionGugunBySido: Record<string, { value: string; label: string }[]>;
  categoryOptions: { value: string; label: string }[];
};

function buildQuery(
  sort: string,
  type: string | null,
  status: string,
  region: string | null,
  category: string | null,
  visits: number | null
): string {
  const p = new URLSearchParams();
  if (sort && sort !== "newest") p.set("sort", sort);
  if (type) p.set("type", type);
  if (status && status !== "open") p.set("status", status);
  if (region) p.set("region", region);
  if (category) p.set("category", category);
  if (visits != null) p.set("visits", String(visits));
  const q = p.toString();
  return q ? `?${q}` : "";
}

function parseSido(region: string | null): string {
  if (!region) return "";
  const i = region.indexOf(" ");
  return i > 0 ? region.slice(0, i) : region;
}
function parseGugun(region: string | null): string {
  if (!region) return "";
  const i = region.indexOf(" ");
  return i > 0 ? region.slice(i + 1) : "";
}

export default function ListingsSortFilter({
  currentSort,
  currentType,
  currentStatus,
  currentRegion,
  currentCategory,
  currentVisits,
  regionSidoOptions,
  regionGugunBySido,
  categoryOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSido = parseSido(currentRegion);
  const currentGugun = parseGugun(currentRegion);
  const gugunOptions = currentSido ? regionGugunBySido[currentSido] ?? [] : [];

  function apply(
    sort: string,
    type: string | null,
    status: string,
    region: string | null,
    category: string | null,
    visits: number | null
  ) {
    const query = buildQuery(sort, type, status, region, category, visits);
    router.push(`${pathname}${query}`);
  }

  function onSidoChange(sido: string) {
    if (!sido) {
      apply(currentSort, currentType, currentStatus, null, currentCategory, currentVisits);
      return;
    }
    apply(currentSort, currentType, currentStatus, sido, currentCategory, currentVisits);
  }
  function onGugunChange(gugun: string) {
    if (!currentSido) return;
    if (!gugun) {
      apply(currentSort, currentType, currentStatus, currentSido, currentCategory, currentVisits);
      return;
    }
    apply(currentSort, currentType, currentStatus, `${currentSido} ${gugun}`, currentCategory, currentVisits);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">정렬</span>
        <select
          value={currentSort}
          onChange={(e) =>
            apply(
              e.target.value,
              currentType,
              currentStatus,
              currentRegion,
              currentCategory,
              currentVisits
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-6 w-px bg-slate-200" aria-hidden />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">유형</span>
        <select
          value={currentType ?? ""}
          onChange={(e) =>
            apply(
              currentSort,
              e.target.value || null,
              currentStatus,
              currentRegion,
              currentCategory,
              currentVisits
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">지역</span>
        <select
          value={currentSido}
          onChange={(e) => onSidoChange(e.target.value || "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">전체</option>
          {regionSidoOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">지역구/시</span>
        <select
          value={currentGugun}
          onChange={(e) => onGugunChange(e.target.value || "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={!currentSido}
        >
          <option value="">전체</option>
          {gugunOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">업무 종류</span>
        <select
          value={currentCategory ?? ""}
          onChange={(e) =>
            apply(
              currentSort,
              currentType,
              currentStatus,
              currentRegion,
              e.target.value || null,
              currentVisits
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">전체</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">주 회수</span>
        <select
          value={currentVisits != null ? String(currentVisits) : ""}
          onChange={(e) =>
            apply(
              currentSort,
              currentType,
              currentStatus,
              currentRegion,
              currentCategory,
              e.target.value ? parseInt(e.target.value, 10) : null
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {VISITS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">마감</span>
        <select
          value={currentStatus}
          onChange={(e) =>
            apply(
              currentSort,
              currentType,
              e.target.value,
              currentRegion,
              currentCategory,
              currentVisits
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
