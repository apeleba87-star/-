import "package:supabase_flutter/supabase_flutter.dart";

const kServiceTypeOptions = [
  "입주청소",
  "이사청소",
  "거주청소",
  "준공청소",
  "사무실청소",
  "상가청소",
  "특수청소",
];

class BusinessProfileData {
  const BusinessProfileData({
    this.companyId,
    this.businessName = "",
    this.ownerName = "",
    this.phone = "",
    this.baseRegion = "",
    this.serviceRegions = const [],
    this.mainServices = const [],
    this.careerYears,
    this.intro = "",
    this.strengths = "",
    this.targetCustomers = "",
    this.writingStyle = "story",
    this.ctaText = "",
    this.homepageUrl = "",
    this.naverPlaceUrl = "",
    this.bannedPhrases = const [],
  });

  final String? companyId;
  final String businessName;
  final String ownerName;
  final String phone;
  final String baseRegion;
  final List<String> serviceRegions;
  final List<String> mainServices;
  final int? careerYears;
  final String intro;
  final String strengths;
  final String targetCustomers;
  final String writingStyle;
  final String ctaText;
  final String homepageUrl;
  final String naverPlaceUrl;
  final List<String> bannedPhrases;

  BusinessProfileData copyWith({
    String? companyId,
    String? businessName,
    String? ownerName,
    String? phone,
    String? baseRegion,
    List<String>? serviceRegions,
    List<String>? mainServices,
    int? careerYears,
    bool clearCareerYears = false,
    String? intro,
    String? strengths,
    String? targetCustomers,
    String? writingStyle,
    String? ctaText,
    String? homepageUrl,
    String? naverPlaceUrl,
    List<String>? bannedPhrases,
  }) {
    return BusinessProfileData(
      companyId: companyId ?? this.companyId,
      businessName: businessName ?? this.businessName,
      ownerName: ownerName ?? this.ownerName,
      phone: phone ?? this.phone,
      baseRegion: baseRegion ?? this.baseRegion,
      serviceRegions: serviceRegions ?? this.serviceRegions,
      mainServices: mainServices ?? this.mainServices,
      careerYears: clearCareerYears ? null : (careerYears ?? this.careerYears),
      intro: intro ?? this.intro,
      strengths: strengths ?? this.strengths,
      targetCustomers: targetCustomers ?? this.targetCustomers,
      writingStyle: writingStyle ?? this.writingStyle,
      ctaText: ctaText ?? this.ctaText,
      homepageUrl: homepageUrl ?? this.homepageUrl,
      naverPlaceUrl: naverPlaceUrl ?? this.naverPlaceUrl,
      bannedPhrases: bannedPhrases ?? this.bannedPhrases,
    );
  }

  factory BusinessProfileData.fromRow(Map<String, dynamic> row) {
    List<String> texts(dynamic raw) {
      if (raw is! List) return const [];
      return [
        for (final item in raw)
          if (item != null && item.toString().trim().isNotEmpty) item.toString().trim(),
      ];
    }

    return BusinessProfileData(
      companyId: row["company_id"] as String?,
      businessName: (row["business_name"] as String?) ?? "",
      ownerName: (row["owner_name"] as String?) ?? "",
      phone: (row["phone"] as String?) ?? "",
      baseRegion: (row["base_region"] as String?) ?? "",
      serviceRegions: texts(row["service_regions"]),
      mainServices: texts(row["main_services"]),
      careerYears: (row["career_years"] as num?)?.toInt(),
      intro: (row["intro"] as String?) ?? "",
      strengths: (row["strengths"] as String?) ?? "",
      targetCustomers: (row["target_customers"] as String?) ?? "",
      writingStyle: (row["writing_style"] as String?) ?? "story",
      ctaText: (row["cta_text"] as String?) ?? "",
      homepageUrl: (row["homepage_url"] as String?) ?? "",
      naverPlaceUrl: (row["naver_place_url"] as String?) ?? "",
      bannedPhrases: texts(row["banned_phrases"]),
    );
  }
}

Future<BusinessProfileData?> loadBusinessProfile(SupabaseClient client, String companyId) async {
  final row = await client
      .schema("cleanidex")
      .from("business_profiles")
      .select(
        "company_id, business_name, owner_name, phone, base_region, service_regions, main_services, career_years, intro, strengths, target_customers, writing_style, cta_text, homepage_url, naver_place_url, banned_phrases",
      )
      .eq("company_id", companyId)
      .maybeSingle();
  if (row == null) return null;
  return BusinessProfileData.fromRow(Map<String, dynamic>.from(row));
}

String? _nullable(String value, int max) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return trimmed.length > max ? trimmed.substring(0, max) : trimmed;
}

List<String> _clipList(List<String> values, int maxItems, int maxLen) {
  final out = <String>[];
  for (final raw in values) {
    final t = raw.trim();
    if (t.isEmpty) continue;
    out.add(t.length > maxLen ? t.substring(0, maxLen) : t);
    if (out.length >= maxItems) break;
  }
  return out;
}

/// 웹 PUT /api/ai-blog/profile 과 같은 검증·저장.
Future<String?> saveBusinessProfile(
  SupabaseClient client, {
  required String companyId,
  required BusinessProfileData profile,
}) async {
  final name = profile.businessName.trim();
  if (name.isEmpty) return "업체명을 입력해 주세요.";
  final style = const {"story", "expert", "checkpoint"}.contains(profile.writingStyle)
      ? profile.writingStyle
      : "story";
  final career = profile.careerYears;
  if (career != null && (career < 0 || career > 80)) {
    return "경력(년)은 0~80 사이로 입력해 주세요.";
  }

  try {
    await client.schema("cleanidex").from("business_profiles").upsert(
      {
        "company_id": companyId,
        "business_name": name.length > 100 ? name.substring(0, 100) : name,
        "owner_name": _nullable(profile.ownerName, 50),
        "phone": _nullable(profile.phone, 30),
        "base_region": _nullable(profile.baseRegion, 100),
        "service_regions": _clipList(profile.serviceRegions, 20, 50),
        "main_services": _clipList(profile.mainServices, 10, 30),
        "career_years": career,
        "intro": _nullable(profile.intro, 1000),
        "strengths": _nullable(profile.strengths, 1000),
        "target_customers": _nullable(profile.targetCustomers, 300),
        "writing_style": style,
        "cta_text": _nullable(profile.ctaText, 300),
        "homepage_url": _nullable(profile.homepageUrl, 300),
        "naver_place_url": _nullable(profile.naverPlaceUrl, 300),
        "banned_phrases": _clipList(profile.bannedPhrases, 50, 50),
        "updated_at": DateTime.now().toUtc().toIso8601String(),
      },
      onConflict: "company_id",
    );
    return null;
  } catch (e) {
    return e.toString();
  }
}
