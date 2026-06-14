import type { Metadata } from "next";
import MagamLiveFeed from "@/components/magam/MagamLiveFeed";
import { getMagamOpenListings } from "@/lib/magam/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "실시간 모집",
  description: "도급·구인·매매 모집 중인 공고",
};

export default async function MagamLivePage() {
  const listings = await getMagamOpenListings({ limit: 50 });

  return (
    <div className="page-shell py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">실시간 모집</h1>
        <p className="mt-1 text-sm text-slate-600">현재 모집 중인 도급·구인·매매 공고입니다. 마감된 글은 목록에서 제외됩니다.</p>
      </header>
      <MagamLiveFeed initialListings={listings} />
    </div>
  );
}
