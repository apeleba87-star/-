import Link from "next/link";
import { searchDemand } from "@/lib/demand/search";

export default function DemandSearchResults({ query }: { query: string }) {
  const q = query.trim();

  if (!q) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        구 이름이나 키워드를 입력해 검색하세요.
      </p>
    );
  }

  const results = searchDemand(q, 25);

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-700">
          「<strong>{q}</strong>」에 대한 결과가 없습니다.
        </p>
        <p className="mt-2 text-sm text-slate-500">예: 강서, 양천, 입주청소, 포장이사</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        「{q}」 검색 결과 <strong>{results.length}</strong>건
      </p>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white ring-1 ring-slate-100/80">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50 sm:px-5"
            >
              <div>
                <p className="font-bold text-slate-900">{r.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{r.subtitle}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-teal-700">열기 →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
