import { formatJobPayForMode } from "@/lib/jobs-public/pay-display-mode";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import {
  jobPublicScopeFromDraft,
  type JobPublicRegionDraft,
} from "@/lib/jobs-public/job-region-scope";
import {
  isNationalPublicJobScope,
  preferenceFromScope,
  type JobPublicRegionPreference,
} from "@/lib/jobs-public/region-preference-shared";
import { buildPageMetadata, getBaseUrl } from "@/lib/seo";

export function jobPublicDraftFromSearchParams(
  params: Record<string, string | string[] | undefined>
): JobPublicRegionDraft | null {
  const rawCity = params.cityId;
  const rawGu = params.guSlug;
  const rawScope = params.scope;
  const cityId = typeof rawCity === "string" ? rawCity.trim() : "";
  const guSlug = typeof rawGu === "string" ? rawGu.trim() : "";
  const scope = typeof rawScope === "string" ? rawScope.trim() : "";

  if (scope === "national") return { scope: "national" };
  if (cityId && guSlug) return { scope: "district", cityId, guSlug };
  if (cityId && scope === "city") return { scope: "city", cityId };
  if (cityId) return { scope: "city", cityId };
  return null;
}

export function parseJobPublicShareRegionFromSearchParams(
  params: Record<string, string | string[] | undefined>
): JobPublicRegionPreference | null {
  const draft = jobPublicDraftFromSearchParams(params);
  if (!draft) return null;
  return preferenceFromScope(jobPublicScopeFromDraft(draft));
}

function topPayLine(job: PublicJobOpeningListItem | null): string | null {
  if (!job) return null;
  const pay = formatJobPayForMode(job, "monthly");
  if (!pay || pay === PUBLIC_JOBS_COPY.payNegotiable) return null;
  return pay;
}

export function buildPublicJobsShareSearch(
  params: Record<string, string | string[] | undefined>
): string {
  const draft = jobPublicDraftFromSearchParams(params);
  const sp = new URLSearchParams();
  if (draft) {
    const inner = buildPublicJobsSharePath(draft).split("?")[1] ?? "";
    for (const [k, v] of new URLSearchParams(inner)) sp.set(k, v);
  }
  const sort = typeof params.sort === "string" ? params.sort : "";
  if (sort && sort !== "pay") sp.set("sort", sort);
  return sp.toString();
}

export function buildPublicJobsOgImageUrl(
  params: Record<string, string | string[] | undefined>
): string {
  const q = buildPublicJobsShareSearch(params);
  return q ? `${getBaseUrl()}/jobs/public/og?${q}` : `${getBaseUrl()}/jobs/public/og`;
}

/** 카카오·OG — 「우리 동네 최고 일자리 + 급여」 */
export function buildPublicJobsShareMetadata(opts: {
  pref: JobPublicRegionPreference;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
  localCount: number;
  path?: string;
  ogQueryParams?: Record<string, string | string[] | undefined>;
}) {
  const { pref, localPay, nationalPay, localCount } = opts;
  const nationalScope = isNationalPublicJobScope(pref);
  const spotlightJob = nationalScope ? nationalPay : localPay ?? nationalPay;
  const payLine = topPayLine(spotlightJob);
  const regionShort = nationalScope ? "전국" : pref.label;

  const title = payLine
    ? nationalScope
      ? `전국 청소·용역 최고 ${payLine}`
      : `${regionShort} 우리 동네 최고 일자리 ${payLine}`
    : `${regionShort} 청소·용역 채용`;

  const countPart =
    localCount > 0 ? `공고 ${localCount.toLocaleString("ko-KR")}건` : "공고 모음";
  const description = `${regionShort} ${countPart} · 급여 높은순·시급·월급 비교 · 청소·미화·용역 | 클린아이덱스`;

  const path = opts.path ?? "/jobs/public";
  const meta = buildPageMetadata({
    title: `${title} | 클린아이덱스`,
    description,
    path,
  });

  const ogImage = buildPublicJobsOgImageUrl(opts.ogQueryParams ?? {});
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      ...meta.twitter,
      images: [ogImage],
    },
  };
}

/** 카톡·밴드 공유용 — 지역이 URL에 포함된 링크 */
export function buildPublicJobsSharePath(draft: JobPublicRegionDraft): string {
  if (draft.scope === "national") return "/jobs/public?scope=national";
  if (draft.scope === "city") {
    return `/jobs/public?scope=city&cityId=${encodeURIComponent(draft.cityId)}`;
  }
  return `/jobs/public?scope=district&cityId=${encodeURIComponent(draft.cityId)}&guSlug=${encodeURIComponent(draft.guSlug)}`;
}

export function buildPublicJobsShareHeadline(opts: {
  pref: JobPublicRegionPreference;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
}): { headline: string; payLine: string | null; regionShort: string } {
  const nationalScope = isNationalPublicJobScope(opts.pref);
  const spotlightJob = nationalScope ? opts.nationalPay : opts.localPay ?? opts.nationalPay;
  const payLine = topPayLine(spotlightJob);
  const regionShort = nationalScope ? "전국" : opts.pref.label;

  const headline = payLine
    ? nationalScope
      ? "전국 청소·용역 최고"
      : `${regionShort} 우리 동네 최고 일자리`
    : `${regionShort} 청소·용역 채용`;

  return { headline, payLine, regionShort };
}

export function buildPublicJobsShareAbsoluteUrl(
  draft: JobPublicRegionDraft,
  opts?: { origin?: string; sort?: string }
): string {
  const origin = opts?.origin ?? getBaseUrl();
  const path = buildPublicJobsSharePath(draft);
  const url = new URL(path, origin);
  if (opts?.sort && opts.sort !== "pay") {
    url.searchParams.set("sort", opts.sort);
  }
  return url.toString();
}

export function buildPublicJobsShareMessage(opts: {
  pref: JobPublicRegionPreference;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
  localCount: number;
  draft: JobPublicRegionDraft;
  sort?: string;
}): { title: string; text: string; url: string } {
  const { headline, payLine, regionShort } = buildPublicJobsShareHeadline(opts);
  const countPart =
    opts.localCount > 0
      ? `${opts.localCount.toLocaleString("ko-KR")}건`
      : "모음";
  const title = payLine ? `${headline} ${payLine}` : headline;
  const text = payLine
    ? `${regionShort} 청소·용역 ${countPart} · 급여 높은순으로 정리했어요.`
    : `${regionShort} 청소·용역 공고 ${countPart}`;
  const url = buildPublicJobsShareAbsoluteUrl(opts.draft, { sort: opts.sort });
  return { title, text, url };
}

/** 상세 공고 카톡·링크 공유 */
export function buildPublicJobDetailShareMessage(opts: {
  jobId: string;
  title: string;
  payDisplay: string;
  regionLabel: string;
  company?: string | null;
}): { title: string; text: string; url: string } {
  const path = `/jobs/public/${encodeURIComponent(opts.jobId)}`;
  const url = `${getBaseUrl()}${path}`;
  const pay = opts.payDisplay?.trim() || PUBLIC_JOBS_COPY.payNegotiable;
  const shareTitle = `${opts.title} · ${pay}`;
  const companyPart = opts.company?.trim() ? ` · ${opts.company.trim()}` : "";
  const text = `${opts.regionLabel} ${pay}${companyPart}`;
  return { title: shareTitle, text, url };
}
