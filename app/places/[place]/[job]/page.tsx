import { notFound } from "next/navigation";
import PlaceJobDetailView from "@/components/knowledge-hub/PlaceJobDetailView";
import {
  getMergedPlaceJob,
  getPlaceJobPath,
  listMergedPlaceJobs,
} from "@/lib/knowledge-hub/place-jobs";
import { getPlaceLabel } from "@/lib/knowledge-hub/solutions/taxonomy";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ place: string; job: string }> };

export async function generateStaticParams() {
  const jobs = await listMergedPlaceJobs();
  return jobs.map((j) => ({ place: j.placeId, job: j.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { place, job: slug } = await params;
  const job = await getMergedPlaceJob(place, slug);
  if (!job) return {};
  return buildPageMetadata({
    title: `${job.title} | 클린아이덱스`,
    description: job.summary ?? `${getPlaceLabel(job.placeId)} 청소 방법`,
    path: getPlaceJobPath(job),
  });
}

export default async function PlaceJobPage({ params }: Props) {
  const { place, job: slug } = await params;
  const job = await getMergedPlaceJob(place, slug);
  if (!job) notFound();

  return (
    <main className="min-h-screen bg-[#f7f5f2]">
      <div className="page-shell py-8 sm:py-10">
        <PlaceJobDetailView job={job} />
      </div>
    </main>
  );
}
