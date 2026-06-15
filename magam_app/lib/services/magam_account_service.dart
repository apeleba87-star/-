import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';

class MagamAccountService {
  MagamAccountService({
    SupabaseClient? client,
    http.Client? httpClient,
  })  : _client = client ?? Supabase.instance.client,
        _http = httpClient ?? http.Client();

  final SupabaseClient _client;
  final http.Client _http;

  /// 서버에서 auth 사용자 삭제. 성공 시 로컬 세션도 종료됩니다.
  Future<void> deleteAccount() async {
    final session = _client.auth.currentSession;
    final token = session?.accessToken;
    if (token == null || token.isEmpty) {
      throw const AuthException('로그인이 필요합니다.');
    }

    final uri = Uri.parse('${AppConfig.shareBaseUrl}/api/magam/delete-account');
    final res = await _http
        .post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        )
        .timeout(const Duration(seconds: 30));

    Map<String, dynamic>? body;
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) body = decoded;
    } catch (_) {}

    if (res.statusCode == 401) {
      throw AuthException(
        body?['error']?.toString() ?? '세션이 만료되었습니다. 다시 로그인해 주세요.',
      );
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body?['error']?.toString() ?? '탈퇴 처리에 실패했습니다. (${res.statusCode})');
    }

    if (body?['ok'] != true) {
      throw Exception(body?['error']?.toString() ?? '탈퇴 처리에 실패했습니다.');
    }

    await _client.auth.signOut();
  }
}
