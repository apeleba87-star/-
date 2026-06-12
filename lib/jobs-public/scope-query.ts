import { isNationalPublicJobScope } from "@/lib/jobs-public-ingest/worknet/region-parse";
import type { JobPublicRegionPreference } from "@/lib/jobs-public/region-preference-shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScopedQuery = any;

/** Postgrest 쿼리에 시·도/구 필터 적용 */
export function applyJobPublicScopeFilter(
  query: ScopedQuery,
  pref: JobPublicRegionPreference
): ScopedQuery {
  if (isNationalPublicJobScope(pref)) return query;
  let q = query.eq("region_sido", pref.sido);
  const gu = pref.sigungu?.trim();
  if (gu) {
    q = q.ilike("region_sigungu", `%${gu}%`);
  }
  return q;
}
