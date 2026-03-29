import Link from "next/link";

export default function MarketingReportEmptyPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">마케팅 리포트 준비 중</h1>
      <p className="mt-3 text-sm text-slate-600">
        아직 발행된 리포트가 없습니다. 관리자에서 키워드를 등록하고 데이터랩 갱신을 실행해 주세요.
      </p>
      <Link href="/news" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
        업계 소식으로
      </Link>
    </div>
  );
}
