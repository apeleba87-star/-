class RadarAdImageCrop {
  const RadarAdImageCrop({
    required this.x,
    required this.y,
    required this.w,
    required this.h,
  });

  final double x;
  final double y;
  final double w;
  final double h;

  factory RadarAdImageCrop.fromJson(Map<String, dynamic> json) {
    double n(dynamic v, [double fallback = 0]) {
      if (v is num) return v.toDouble();
      return fallback;
    }

    return RadarAdImageCrop(
      x: n(json['x']),
      y: n(json['y']),
      w: n(json['w'], 1),
      h: n(json['h'], 1),
    );
  }
}

class RadarAdSlot {
  const RadarAdSlot({
    required this.id,
    required this.slotIndex,
    required this.category,
    required this.title,
    this.description,
    this.imageUrl,
    required this.imageCrop,
    required this.ctaText,
    required this.ctaUrl,
    this.advertiserName,
  });

  final String id;
  final int slotIndex;
  final String category;
  final String title;
  final String? description;
  final String? imageUrl;
  final RadarAdImageCrop imageCrop;
  final String ctaText;
  final String ctaUrl;
  final String? advertiserName;

  factory RadarAdSlot.fromJson(Map<String, dynamic> json) {
    return RadarAdSlot(
      id: json['id'] as String,
      slotIndex: (json['slotIndex'] as num?)?.toInt() ?? 1,
      category: json['category'] as String? ?? 'other',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      imageCrop: RadarAdImageCrop.fromJson(
        (json['imageCrop'] as Map<String, dynamic>?) ?? const {},
      ),
      ctaText: json['ctaText'] as String? ?? '자세히',
      ctaUrl: json['ctaUrl'] as String? ?? '',
      advertiserName: json['advertiserName'] as String?,
    );
  }
}

class RadarAdBanner {
  const RadarAdBanner({
    required this.scope,
    this.regionKey,
    this.regionLabel,
    required this.rotationSeconds,
    required this.slots,
  });

  final String scope;
  final String? regionKey;
  final String? regionLabel;
  final int rotationSeconds;
  final List<RadarAdSlot> slots;

  factory RadarAdBanner.fromJson(Map<String, dynamic> json) {
    final slotsRaw = json['slots'];
    final slots = slotsRaw is List
        ? slotsRaw
            .whereType<Map<String, dynamic>>()
            .map(RadarAdSlot.fromJson)
            .toList()
        : <RadarAdSlot>[];

    return RadarAdBanner(
      scope: json['scope'] as String? ?? 'national',
      regionKey: json['regionKey'] as String?,
      regionLabel: json['regionLabel'] as String?,
      rotationSeconds: (json['rotationSeconds'] as num?)?.toInt() ?? 10,
      slots: slots,
    );
  }

  String get badgeLabel {
    if (scope == 'national') return '전국 제휴';
    if (regionLabel != null && regionLabel!.isNotEmpty) {
      return '${regionLabel!} 지역 광고';
    }
    return '지역 광고';
  }
}
