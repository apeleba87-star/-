import { revalidatePath, revalidateTag } from "next/cache";

/** 일당 리포트 저장·크론 후 허브 티저·리포트 ISR 갱신 */
export function revalidateJobWageReport(reportDate?: string | null): void {
  revalidateTag("job-wage-report", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/job-market-report");
  if (reportDate) {
    revalidatePath(`/job-market-report/${reportDate}`);
  }
}
