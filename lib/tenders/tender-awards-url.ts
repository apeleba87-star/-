import { isValidSido } from "@/lib/tenders/user-focus";

/** 낙찰·개찰 목록 URL 쿼리 (입찰 목록과 동일 industry/region/gugun 패턴 + sort + page) */
export function buildTenderAwardsSearchParams(url: {
  industryCodes: string[];
  regionSido: string | null;
  regionGugun: string | null;
  sort?: string;
  page?: number;
}): string {
  const q = new URLSearchParams();
  if (url.industryCodes.length > 0) q.set("industry", url.industryCodes.join(","));
  if (isValidSido(url.regionSido)) q.set("region", url.regionSido!);
  if (url.regionGugun) q.set("gugun", url.regionGugun);
  if (url.sort && url.sort !== "openg") q.set("sort", url.sort);
  if (url.page != null && url.page > 1) q.set("page", String(url.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}
