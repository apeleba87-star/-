import Link from "next/link";
import { Suspense } from "react";
import DemandShell from "@/components/demand/DemandShell";
import DemandSearch from "@/components/demand/DemandSearch";
import DemandSearchResults from "@/components/demand/DemandSearchResults";

export const metadata = {
  title: "검색 | 입주수요 | 클린아이덱스",
};

function ResultsFallback() {
  return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
}

export default function DemandSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <DemandShell title="검색" subtitle={undefined} searchVariant={false}>
      <Suspense fallback={null}>
        <SearchPageInner searchParams={searchParams} />
      </Suspense>
    </DemandShell>
  );
}

async function SearchPageInner({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return (
    <>
      <DemandSearch variant="bar" initialQuery={q} autoFocus />
      <Suspense fallback={<ResultsFallback />}>
        <DemandSearchResults query={q} />
      </Suspense>
      <p className="mt-8 text-center">
        <Link href="/demand" className="text-sm font-semibold text-slate-500 hover:text-teal-700">
          ← 입주수요 허브
        </Link>
      </p>
    </>
  );
}
