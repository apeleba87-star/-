import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadFieldReport } from "@/lib/ai-blog/field-report";
import { getBaseUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const SHARE_TITLE = "작업 보고서 · 클린아이덱스";
const SHARE_DESCRIPTION = "작업 전/후 사진과 보고서를 확인하세요.";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const report = await loadFieldReport(token);
  const pageUrl = `${getBaseUrl()}/report/${token}`;
  return {
    title: report ? `${report.space} 청소 보고서` : "청소 보고서",
    description: SHARE_DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: {
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      url: pageUrl,
      siteName: "클린아이덱스",
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function FieldReportPage({ params }: Params) {
  const { token } = await params;
  const report = await loadFieldReport(token);
  if (!report) notFound();
  const heading = report.status === "청소 완료" ? "청소 완료 보고서" : "청소 진행 보고서";
  const rows = [
    ["공간", report.space],
    ["담당", report.manager],
    ["청소내용", report.service],
    ["청소기간", report.period],
    ["상태", report.status],
  ].filter((row) => row[1]);

  return (
    <div className="min-h-screen bg-[#ececec] px-3 py-6 text-[#18181b]">
      <article className="mx-auto w-full max-w-[640px] bg-white shadow-sm">
        <header className="px-5 pb-4 pt-6">
          <div className="flex items-center justify-between text-xs tracking-wide text-[#71717a]">
            <span>청소 보고서</span>
            <span>{report.issuedOn}</span>
          </div>
          <h1 className="mt-3 text-[28px] font-black leading-tight">{heading}</h1>
          <span className="mt-3 inline-flex rounded-md bg-[#f4f4f5] px-3 py-1 text-sm text-[#3f3f46]">{report.status}</span>
        </header>
        <dl className="border-t border-[#18181b]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 border-b border-[#e4e4e7] px-5 py-3 text-sm">
              <dt className="w-20 shrink-0 text-[#71717a]">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {report.places.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#71717a]">아직 올릴 사진이 없습니다.</p>
        ) : (
          report.places.map((place, index) => (
            <section key={`${index}-${place.label}`} className="px-5 pt-6">
              <h2 className="text-lg font-bold">
                <span className="mr-2">{String(index + 1).padStart(2, "0")}</span>
                {place.label}
              </h2>
              <PhotoGroup label="청소 전" url={place.beforeUrl} />
              <PhotoGroup label="청소 후" url={place.afterUrl} />
            </section>
          ))
        )}
        <p className="px-5 py-8 text-center text-sm text-[#a1a1aa]">클린아이덱스로 작성된 보고서입니다</p>
      </article>
    </div>
  );
}

function PhotoGroup({ label, url }: { label: string; url: string | null }) {
  const count = url ? 1 : 0;
  return (
    <div className="mt-3 rounded-xl border border-[#e4e4e7] p-3">
      <p className="text-sm">
        <span className="font-semibold">{label}</span> <span className="text-[#a1a1aa]">{count}장</span>
      </p>
      {url ? (
        // 서명 주소는 요청마다 바뀌므로 최적화 캐시를 쓰지 않는다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="mt-2 max-h-72 w-auto max-w-full rounded-md object-contain" />
      ) : (
        <p className="mt-3 text-sm text-[#a1a1aa]">없음</p>
      )}
    </div>
  );
}
