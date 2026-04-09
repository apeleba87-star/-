import Link from "next/link";
import {
  calcPartnerPerformanceMetrics,
  partnerInquiryConversionPercent,
  type PartnerPerformanceEventRow,
} from "@/lib/partners/partner-performance-metrics";

type CompanyRow = { id: string; name: string; status: string };

export default function AdminPartnerPerformancePanel({
  companies,
  eventsByCompanyId,
}: {
  companies: CompanyRow[];
  eventsByCompanyId: Map<string, PartnerPerformanceEventRow[]>;
}) {
  if (companies.length === 0) {
    return <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">표시할 업체가 없습니다.</p>;
  }

  const sorted = [...companies].sort((a, b) => {
    const eb = eventsByCompanyId.get(b.id) ?? [];
    const ea = eventsByCompanyId.get(a.id) ?? [];
    const mb = calcPartnerPerformanceMetrics(eb).contact30;
    const ma = calcPartnerPerformanceMetrics(ea).contact30;
    return mb - ma;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-950">
        <p className="font-semibold text-amber-900">지표 안내</p>
        <p className="mt-1 text-amber-900/90">
          상세조회·문의클릭은 이벤트 로그 기준이며, <strong>최근 7일·30일</strong>은 오늘 시점으로 되돌아간 구간입니다. 문의전환율은 문의클릭 ÷ 상세조회(같은 기간)입니다.
        </p>
      </div>

      <div className="space-y-4">
        {sorted.map((company) => {
          const metrics = calcPartnerPerformanceMetrics(eventsByCompanyId.get(company.id) ?? []);
          return (
            <section key={company.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{company.name}</h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{company.status}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">상세조회(7일)</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.detail7}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">문의클릭(7일)</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.contact7}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">상세조회(30일)</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.detail30}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">문의클릭(30일)</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.contact30}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p className="text-sm text-slate-600">
                  7일 문의전환율:{" "}
                  <span className="font-semibold text-slate-900">{partnerInquiryConversionPercent(metrics.contact7, metrics.detail7)}</span>
                </p>
                <p className="text-sm text-slate-600">
                  30일 문의전환율:{" "}
                  <span className="font-semibold text-slate-900">{partnerInquiryConversionPercent(metrics.contact30, metrics.detail30)}</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <Link
                  href={`/partners/${company.id}`}
                  className="font-medium text-emerald-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  공개 상세
                </Link>
                <Link href={`/admin/partners/${company.id}/edit`} className="font-medium text-sky-700 underline">
                  관리자 수정
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
