import "server-only";
import { cookies } from "next/headers";
import {
  JOB_PUBLIC_REGION_COOKIE,
  parseRegionCookie,
  type JobPublicRegionPreference,
} from "@/lib/jobs-public/region-preference-shared";

export {
  JOB_PUBLIC_REGION_COOKIE,
  NATIONAL_PUBLIC_JOB_SIDO,
  isNationalPublicJobScope,
  parseRegionCookie,
  preferenceFromScope,
  serializeRegionPreference,
  type JobPublicRegionPreference,
} from "@/lib/jobs-public/region-preference-shared";

export async function getJobPublicRegionPreference(): Promise<JobPublicRegionPreference> {
  const jar = await cookies();
  return parseRegionCookie(jar.get(JOB_PUBLIC_REGION_COOKIE)?.value);
}
