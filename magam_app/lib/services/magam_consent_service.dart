import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/magam_copy.dart';

class MagamConsentService {
  MagamConsentService(this._client);

  final SupabaseClient _client;

  static const _consentSelect = 'magam_sync_consent_at, magam_sync_consent_version';

  Future<bool> hasSyncConsent() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return false;

    final row = await _client
        .from('profiles')
        .select(_consentSelect)
        .eq('id', userId)
        .maybeSingle();

    if (row == null) return false;
    final at = row['magam_sync_consent_at'];
    return at != null && at.toString().isNotEmpty;
  }

  Future<void> recordSyncConsent() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;

    await _client.from('profiles').update({
      'magam_sync_consent_at': DateTime.now().toUtc().toIso8601String(),
      'magam_sync_consent_version': magamSyncConsentVersion,
    }).eq('id', userId);
  }

  Future<void> revokeSyncConsent() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;

    await _client.from('profiles').update({
      'magam_sync_consent_at': null,
      'magam_sync_consent_version': null,
    }).eq('id', userId);
  }
}
