import 'package:supabase_flutter/supabase_flutter.dart';

import '../utils/kr_phone_format.dart';

class MagamProfileService {
  MagamProfileService(this._client);

  final SupabaseClient _client;

  Future<String?> loadContactPhone() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return null;

    try {
      final row = await _client
          .from('profiles')
          .select('magam_contact_phone')
          .eq('id', userId)
          .maybeSingle();

      if (row == null) return null;
      final phone = row['magam_contact_phone'] as String?;
      if (phone == null || phone.trim().isEmpty) return null;
      return KrPhoneFormat.formatInput(phone.trim());
    } catch (_) {
      return null;
    }
  }

  Future<void> saveContactPhone(String phone) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;

    await _client.from('profiles').update({
      'magam_contact_phone': KrPhoneFormat.normalize(phone),
    }).eq('id', userId);
  }
}
