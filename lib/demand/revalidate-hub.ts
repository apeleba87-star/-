import { revalidatePath, revalidateTag } from "next/cache";

/** demand 수집(cron/admin) 성공 후 허브 캐시·ISR 갱신 */
export function revalidateDemandHub(): void {
  revalidateTag("demand-rtms", { expire: 0 });
  revalidateTag("demand-keyword", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/demand/top");
}
