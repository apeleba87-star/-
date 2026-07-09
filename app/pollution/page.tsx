import Link from "next/link";
import { listContaminants } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { CONTAMINANT_TYPE_KO } from "@/lib/knowledge-hub/korean-labels";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "오염별 제거 | 클린아이덱스",
  description: "물때·기름때·곰팡이 등 오염 유형별 제거 방법과 레시피.",
  path: "/pollution",
});

export default function PollutionHubPage() {
  const contaminants = listContaminants();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">오염별 제거</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          오염 유형을 먼저 파악한 뒤 재질에 맞는 레시피를 선택하세요.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {contaminants.map((c) => (
          <li key={c.id}>
            <Link
              href={`/pollution/${c.id}`}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-rose-300 hover:shadow-sm"
            >
              <span className="text-xs font-bold text-rose-700">{CONTAMINANT_TYPE_KO[c.type]}</span>
              <h2 className="mt-1 text-xl font-black text-slate-900">{c.name}</h2>
              {c.notes ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.notes}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
