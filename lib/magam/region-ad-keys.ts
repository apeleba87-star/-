/** Flutter magam_region_key.dart — 입주레이더 region_key 와 동일 */
export function magamRegionalAdCandidateKeys(
  cityId: string,
  districtSlug: string
): string[] {
  return [`district:${cityId}:${districtSlug}`, `city:${cityId}`];
}

export function magamRegionalAdKeysForListing(listing: {
  city_id?: string | null;
  district_slug?: string | null;
  region_gu: string;
}): string[] {
  const cityId = listing.city_id?.trim();
  const districtSlug = listing.district_slug?.trim();
  if (cityId && districtSlug) {
    return magamRegionalAdCandidateKeys(cityId, districtSlug);
  }
  return [];
}
