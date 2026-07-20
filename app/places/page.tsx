import PlaceJobsCatalog from "@/components/knowledge-hub/PlaceJobsCatalog";
import { listPlaceJobCards } from "@/lib/knowledge-hub/place-jobs";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "장소별 청소 방법 — 루틴·걸레질 | 클린아이덱스",
  description:
    "사무실·헬스장·학원 등 장소별 정기청소 순서, 걸레질, 화장실·탕비실 루틴을 안내합니다.",
  path: "/places",
});

export default async function PlacesHubPage() {
  const jobs = await listPlaceJobCards();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <PlaceJobsCatalog jobs={jobs} />
        </div>
      </div>
    </main>
  );
}
