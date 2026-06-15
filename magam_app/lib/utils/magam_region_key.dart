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
