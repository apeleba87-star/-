import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/radar_ad.dart';

class RadarAdService {
  RadarAdService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  static const _impressionCooldownMs = 30 * 60 * 1000;

  String get _apiBase => AppConfig.shareBaseUrl;

  Future<RadarAdBanner?> fetchNationalBanner() async {
    final uri = Uri.parse('$_apiBase/api/magam/radar-ads/national');
    return _fetchBanner(uri);
  }

  Future<RadarAdBanner?> fetchRegionalBanner(String regionKey) async {
    final uri = Uri.parse('$_apiBase/api/magam/radar-ads/regional').replace(
      queryParameters: {'region': regionKey},
    );
    return _fetchBanner(uri);
  }

  Future<RadarAdBanner?> fetchFirstRegionalBanner(List<String> regionKeys) async {
    for (final key in regionKeys) {
      final banner = await fetchRegionalBanner(key);
      if (banner != null && banner.slots.isNotEmpty) return banner;
    }
    return null;
  }

  Future<RadarAdBanner?> _fetchBanner(Uri uri) async {
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body);
      if (data is! Map<String, dynamic>) return null;
      final bannerJson = data['banner'];
      if (bannerJson is! Map<String, dynamic>) return null;
      final banner = RadarAdBanner.fromJson(bannerJson);
      return banner.slots.isEmpty ? null : banner;
    } catch (_) {
      return null;
    }
  }

  Future<void> trackEvent({
    required String eventType,
    required String slotId,
    required String pagePath,
  }) async {
    if (eventType == 'impression') {
      final prefs = await SharedPreferences.getInstance();
      final key = 'radar_ad_imp_$slotId';
      final last = prefs.getInt(key);
      final now = DateTime.now().millisecondsSinceEpoch;
      if (last != null && now - last < _impressionCooldownMs) return;
      await prefs.setInt(key, now);
    }

    final sessionId = await _sessionId();
    final visitorId = await _visitorId();

    try {
      await _client
          .post(
            Uri.parse('$_apiBase/api/demand/radar-ads/event'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'event_type': eventType,
              'slot_id': slotId,
              'session_id': sessionId,
              'anon_visitor_id': visitorId,
              'page_path': pagePath,
              'meta': {'surface': 'magam_app'},
            }),
          )
          .timeout(const Duration(seconds: 8));
    } catch (_) {}
  }

  Future<String> _sessionId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('radar_ad_session_id');
    if (id == null || id.isEmpty) {
      id = DateTime.now().microsecondsSinceEpoch.toString();
      await prefs.setString('radar_ad_session_id', id);
    }
    return id;
  }

  Future<String> _visitorId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('radar_ad_visitor_id');
    if (id == null || id.isEmpty) {
      id = 'v-${DateTime.now().microsecondsSinceEpoch}';
      await prefs.setString('radar_ad_visitor_id', id);
    }
    return id;
  }
}
