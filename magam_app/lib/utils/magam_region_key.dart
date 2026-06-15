import '../constants/region_registry.g.dart';
import '../models/magam_listing.dart';

/// 입주레이더 region_key — 마감앱 시·군·구 id와 동일
List<String> magamRegionalAdCandidateKeys(String cityId, String districtSlug) {
  return [
    'district:$cityId:$districtSlug',
    'city:$cityId',
  ];
}

String magamDistrictRegionKey(String cityId, String districtSlug) {
  return 'district:$cityId:$districtSlug';
}

({String cityId, String districtSlug})? resolveMagamRegionFromLabel(String? label) {
  final trimmed = label?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;

  for (final city in kMagamRegionCities) {
    for (final district in city.districts) {
      if (city.labelFor(district) == trimmed) {
        return (cityId: city.id, districtSlug: district.slug);
      }
    }
  }
  return null;
}

List<String> magamRegionalAdKeysForListing(MagamListing listing) {
  final cityId = listing.cityId;
  final districtSlug = listing.districtSlug;
  if (cityId != null &&
      districtSlug != null &&
      cityId.isNotEmpty &&
      districtSlug.isNotEmpty) {
    return magamRegionalAdCandidateKeys(cityId, districtSlug);
  }

  final resolved = resolveMagamRegionFromLabel(listing.regionGu);
  if (resolved != null) {
    return magamRegionalAdCandidateKeys(resolved.cityId, resolved.districtSlug);
  }
  return const [];
}
