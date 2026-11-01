import "package:supabase_flutter/supabase_flutter.dart";

class WorkerProfile {
  const WorkerProfile({
    this.nickname,
    this.birthDate,
    this.gender,
    this.bio,
    this.contactPhone,
  });

  final String? nickname;
  final String? birthDate;
  final String? gender;
  final String? bio;
  final String? contactPhone;

  WorkerProfile copyWith({
    String? nickname,
    String? birthDate,
    String? gender,
    String? bio,
    String? contactPhone,
  }) {
    return WorkerProfile(
      nickname: nickname ?? this.nickname,
      birthDate: birthDate ?? this.birthDate,
      gender: gender ?? this.gender,
      bio: bio ?? this.bio,
      contactPhone: contactPhone ?? this.contactPhone,
    );
  }
}

bool isValidBirthDate(String? value) {
  if (value == null || value.trim().isEmpty) return false;
  final match = RegExp(r"^(\d{4})-(\d{2})-(\d{2})$").firstMatch(value.trim());
  if (match == null) return false;
  final y = int.parse(match.group(1)!);
  final m = int.parse(match.group(2)!);
  final d = int.parse(match.group(3)!);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  final date = DateTime(y, m, d);
  return date.year == y && date.month == m && date.day == d;
}

String formatPhoneInput(String value) {
  final digits = value.replaceAll(RegExp(r"\D"), "");
  final clipped = digits.length > 11 ? digits.substring(0, 11) : digits;
  if (clipped.length <= 3) return clipped;
  if (clipped.length <= 7) return "${clipped.substring(0, 3)}-${clipped.substring(3)}";
  return "${clipped.substring(0, 3)}-${clipped.substring(3, 7)}-${clipped.substring(7)}";
}

Future<WorkerProfile> loadWorkerProfile(SupabaseClient client, String userId) async {
  final row = await client
      .from("worker_profiles")
      .select("nickname, birth_date, gender, bio, contact_phone")
      .eq("user_id", userId)
      .maybeSingle();
  if (row == null) return const WorkerProfile();
  return WorkerProfile(
    nickname: row["nickname"] as String?,
    birthDate: row["birth_date"] as String?,
    gender: row["gender"] as String?,
    bio: row["bio"] as String?,
    contactPhone: row["contact_phone"] as String?,
  );
}

/// 웹 updateWorkerProfileForApply 와 같은 검증·저장.
Future<String?> saveWorkerProfile(
  SupabaseClient client, {
  required String userId,
  required String nickname,
  required String? birthDate,
  required String? gender,
  required String? bio,
  required String? contactPhone,
}) async {
  final birth = (birthDate ?? "").trim();
  final sex = gender == "M" || gender == "F" ? gender : null;
  if (!isValidBirthDate(birth)) {
    return "생일을 올바르게 입력해 주세요. (예: 1990-01-01)";
  }
  if (sex == null) {
    return "성별을 선택해 주세요. (남/여)";
  }

  final existing = await client.from("worker_profiles").select("nickname").eq("user_id", userId).maybeSingle();
  final existingNick = (existing?["nickname"] as String?)?.trim();
  final inputNick = nickname.trim();
  final keptNickname =
      (existingNick != null && existingNick.isNotEmpty) ? existingNick : (inputNick.isNotEmpty ? inputNick : null);

  try {
    await client.from("worker_profiles").upsert(
      {
        "user_id": userId,
        "nickname": keptNickname,
        "birth_date": birth,
        "gender": sex,
        "bio": (bio ?? "").trim().isEmpty ? null : (bio ?? "").trim(),
        "contact_phone": (contactPhone ?? "").trim().isEmpty ? null : (contactPhone ?? "").trim(),
        "updated_at": DateTime.now().toUtc().toIso8601String(),
      },
      onConflict: "user_id",
    );
    return null;
  } catch (e) {
    return e.toString();
  }
}
