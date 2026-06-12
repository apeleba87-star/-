import { revalidatePath, revalidateTag } from "next/cache";

/** 워크넷 동기화 후 채용 목록·티저 캐시 무효화 */
export function revalidateJobsPublic(): void {
  revalidateTag("jobs-public", { expire: 0 });
  revalidatePath("/jobs/public");
}
