import AdminPlaceJobsPanel from "@/components/admin/AdminPlaceJobsPanel";
import { listSeedPlaceJobs, getPlaceJobPath } from "@/lib/knowledge-hub/place-jobs";
import { listAllDbPlaceJobs } from "@/lib/knowledge-hub/place-jobs/store";

export default async function AdminPlaceJobsPage() {
  const [dbJobs] = await Promise.all([listAllDbPlaceJobs()]);
  const seedJobs = listSeedPlaceJobs({ publishedOnly: false }).map((j) => ({
    ...j,
    source: "seed" as const,
    path: getPlaceJobPath(j),
  }));
  const dbItems = dbJobs.map((j) => ({
    ...j,
    source: "db" as const,
    path: getPlaceJobPath(j),
  }));

  return <AdminPlaceJobsPanel seedJobs={seedJobs} dbJobs={dbItems} />;
}
