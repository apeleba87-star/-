import 'package:shared_preferences/shared_preferences.dart';

class RecentRegion {
  const RecentRegion({required this.cityId, required this.districtSlug});

  final String cityId;
  final String districtSlug;

  String get key => '$cityId:$districtSlug';

  static RecentRegion? fromKey(String key) {
    final i = key.indexOf(':');
    if (i <= 0) return null;
    return RecentRegion(
      cityId: key.substring(0, i),
      districtSlug: key.substring(i + 1),
    );
  }
}

class RecentRegionsStore {
  static const _prefKey = 'magam_recent_regions_v1';

  Future<List<RecentRegion>> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_prefKey) ?? [];
      return raw
          .map(RecentRegion.fromKey)
          .whereType<RecentRegion>()
          .take(3)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> push(String cityId, String districtSlug) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final entry = RecentRegion(cityId: cityId, districtSlug: districtSlug);
      final existing = (prefs.getStringList(_prefKey) ?? [])
          .where((k) => k != entry.key)
          .toList();
      final next = [entry.key, ...existing].take(3).toList();
      await prefs.setStringList(_prefKey, next);
    } catch (_) {
      // 웹/플러그인 미지원 시 무시
    }
  }
}
