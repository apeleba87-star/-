import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 30;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return false;
  return ts <= Date.now();
}

export default async function ListingShareLandingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const channel = (getFirstQueryValue(query.ch) ?? "unknown").trim() || "unknown";
  const supabase = createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, status, is_private, deleted_at, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (!listing || listing.deleted_at) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">삭제된 글입니다</h1>
          <p className="mt-2 text-sm text-slate-600">요청하신 현장거래 글은 삭제되어 더 이상 확인할 수 없습니다.</p>
          <Link href="/listings" className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            현장거래 목록 보기
          </Link>
        </section>
      </main>
    );
  }

  if (listing.is_private) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">비공개 글입니다</h1>
          <p className="mt-2 text-sm text-slate-600">요청하신 현장거래 글은 비공개 처리되어 접근할 수 없습니다.</p>
          <Link href="/listings" className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            현장거래 목록 보기
          </Link>
        </section>
      </main>
    );
  }

  if (listing.status === "closed" || isExpired(listing.expires_at)) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">거래가 종료된 글입니다</h1>
          <p className="mt-2 text-sm text-slate-600">공유된 거래는 이미 마감 또는 만료되어 참여할 수 없습니다.</p>
          <p className="mt-1 text-xs text-slate-500">{listing.title}</p>
          <Link href="/listings" className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            최신 현장거래 보기
          </Link>
        </section>
      </main>
    );
  }

  redirect(`/listings/${id}?ref=listing_share&channel=${encodeURIComponent(channel)}`);
}
