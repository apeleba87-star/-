enum ShotUpload { local, uploading, done, failed }

class FieldShot {
  FieldShot({
    required this.mediaId,
    required this.role,
    this.localPath,
    this.storagePath,
    this.previewPath,
    this.upload = ShotUpload.local,
    this.error,
    this.expiresAt,
    this.gallerySaved = false,
    this.galleryName,
  });

  final String mediaId;
  final String role;
  final String? localPath;
  final String? storagePath;
  final String? previewPath;
  final ShotUpload upload;
  final String? error;
  final DateTime? expiresAt;
  final bool gallerySaved;
  final String? galleryName;

  bool get pending => upload != ShotUpload.done && (localPath != null && localPath!.isNotEmpty);

  FieldShot copyWith({
    String? localPath,
    String? storagePath,
    String? previewPath,
    ShotUpload? upload,
    String? error,
    DateTime? expiresAt,
    bool? gallerySaved,
    String? galleryName,
    bool clearError = false,
  }) {
    return FieldShot(
      mediaId: mediaId,
      role: role,
      localPath: localPath ?? this.localPath,
      storagePath: storagePath ?? this.storagePath,
      previewPath: previewPath ?? this.previewPath,
      upload: upload ?? this.upload,
      error: clearError ? null : (error ?? this.error),
      expiresAt: expiresAt ?? this.expiresAt,
      gallerySaved: gallerySaved ?? this.gallerySaved,
      galleryName: galleryName ?? this.galleryName,
    );
  }

  Map<String, dynamic> toJson() => {
        "mediaId": mediaId,
        "role": role,
        "localPath": localPath,
        "storagePath": storagePath,
        "previewPath": previewPath,
        "upload": upload.name,
        "error": error,
        "expiresAt": expiresAt?.toIso8601String(),
        "gallerySaved": gallerySaved,
        "galleryName": galleryName,
      };

  factory FieldShot.fromJson(Map<String, dynamic> json) {
    return FieldShot(
      mediaId: json["mediaId"] as String,
      role: json["role"] as String? ?? "BEFORE",
      localPath: json["localPath"] as String?,
      storagePath: json["storagePath"] as String?,
      previewPath: json["previewPath"] as String?,
      upload: ShotUpload.values.byName(json["upload"] as String? ?? "local"),
      error: json["error"] as String?,
      expiresAt: json["expiresAt"] == null ? null : DateTime.tryParse(json["expiresAt"] as String),
      gallerySaved: json["gallerySaved"] == true,
      galleryName: json["galleryName"] as String?,
    );
  }
}

class FieldPlace {
  FieldPlace({
    required this.id,
    required this.label,
    required this.sortOrder,
    this.condition = "",
    this.synced = false,
    this.before,
    this.after,
  });

  final String id;
  final String label;
  final String condition;
  final int sortOrder;
  final bool synced;
  final FieldShot? before;
  final FieldShot? after;

  FieldShot? shotFor(String role) => role == "AFTER" ? after : before;

  FieldPlace copyWith({
    String? condition,
    bool? synced,
    FieldShot? before,
    FieldShot? after,
    bool clearBefore = false,
    bool clearAfter = false,
  }) {
    return FieldPlace(
      id: id,
      label: label,
      condition: condition ?? this.condition,
      sortOrder: sortOrder,
      synced: synced ?? this.synced,
      before: clearBefore ? null : (before ?? this.before),
      after: clearAfter ? null : (after ?? this.after),
    );
  }

  Map<String, dynamic> toJson() => {
        "id": id,
        "label": label,
        "condition": condition,
        "sortOrder": sortOrder,
        "synced": synced,
        "before": before?.toJson(),
        "after": after?.toJson(),
      };

  factory FieldPlace.fromJson(Map<String, dynamic> json) {
    return FieldPlace(
      id: json["id"] as String,
      label: json["label"] as String? ?? "",
      condition: json["condition"] as String? ?? "",
      sortOrder: (json["sortOrder"] as num?)?.toInt() ?? 0,
      synced: json["synced"] == true,
      before: json["before"] == null ? null : FieldShot.fromJson(Map<String, dynamic>.from(json["before"] as Map)),
      after: json["after"] == null ? null : FieldShot.fromJson(Map<String, dynamic>.from(json["after"] as Map)),
    );
  }
}

class FieldJob {
  FieldJob({
    required this.id,
    required this.name,
    required this.serviceType,
    required this.title,
    required this.createdAt,
    this.synced = false,
    this.places = const [],
  });

  final String id;
  final String name;
  final String serviceType;
  final String title;
  final DateTime createdAt;
  final bool synced;
  final List<FieldPlace> places;

  int get pairCount => places.where((p) => p.before != null && p.after != null).length;

  String get statusLabel {
    final shots = places.expand((p) => [p.before, p.after]).whereType<FieldShot>();
    if (shots.any((s) => s.upload == ShotUpload.failed)) return "올리기 실패";
    if (shots.any((s) => s.upload == ShotUpload.uploading || s.upload == ShotUpload.local)) {
      return shots.any((s) => s.upload == ShotUpload.local) ? "아직 폰에만 있음" : "올리는 중";
    }
    if (!synced) return "아직 폰에만 있음";
    final expiry = shots
        .where((s) => s.storagePath != null && s.expiresAt != null)
        .map((s) => s.expiresAt!)
        .fold<DateTime?>(null, (min, d) => min == null || d.isBefore(min) ? d : min);
    if (expiry == null) return pairCount > 0 ? "PC에서 글 쓸 수 있음" : "장소 없음";
    final days = expiry.difference(DateTime.now()).inDays;
    if (days < 0) return "원본 보관 끝";
    return "원본 보관 $days일 남음";
  }

  FieldJob copyWith({bool? synced, List<FieldPlace>? places}) {
    return FieldJob(
      id: id,
      name: name,
      serviceType: serviceType,
      title: title,
      createdAt: createdAt,
      synced: synced ?? this.synced,
      places: places ?? this.places,
    );
  }

  Map<String, dynamic> toJson() => {
        "id": id,
        "name": name,
        "serviceType": serviceType,
        "title": title,
        "createdAt": createdAt.toIso8601String(),
        "synced": synced,
        "places": places.map((p) => p.toJson()).toList(),
      };

  factory FieldJob.fromJson(Map<String, dynamic> json) {
    return FieldJob(
      id: json["id"] as String,
      name: json["name"] as String? ?? "",
      serviceType: json["serviceType"] as String? ?? "",
      title: json["title"] as String? ?? "",
      createdAt: DateTime.tryParse(json["createdAt"] as String? ?? "") ?? DateTime.now(),
      synced: json["synced"] == true,
      places: [
        for (final raw in (json["places"] as List? ?? const []))
          FieldPlace.fromJson(Map<String, dynamic>.from(raw as Map)),
      ],
    );
  }
}

String fieldJobTitle({
  String? sigungu,
  String? dong,
  String? property,
  num? pyeong,
  required String service,
}) {
  final place = [sigungu, dong].whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty).join(" ");
  final size = [
    property?.trim(),
    pyeong == null ? null : "${_trimNum(pyeong)}평",
  ].whereType<String>().where((s) => s.isNotEmpty).join(" ");
  return [place, size, service.trim()].where((s) => s.isNotEmpty).join(" · ");
}

String _trimNum(num n) {
  if (n == n.roundToDouble()) return n.toInt().toString();
  return n.toString();
}

String _pickCondition(String local, String remote) {
  final onPhone = local.trim();
  if (onPhone.isNotEmpty) return onPhone;
  return remote.trim();
}

FieldShot? _pickShot(FieldShot? local, FieldShot? remote) {
  if (local != null && local.pending) return local;
  if (remote != null && local != null) {
    return remote.copyWith(
      localPath: local.localPath ?? remote.localPath,
      gallerySaved: local.gallerySaved || remote.gallerySaved,
      galleryName: local.galleryName ?? remote.galleryName,
    );
  }
  return remote ?? local;
}

FieldPlace? _placeById(List<FieldPlace> places, String id) {
  for (final place in places) {
    if (place.id == id) return place;
  }
  return null;
}

List<FieldJob> mergeJobs(List<FieldJob> local, List<FieldJob> remote) {
  final localById = {for (final job in local) job.id: job};
  final remoteIds = remote.map((job) => job.id).toSet();
  final merged = <FieldJob>[];
  for (final remoteJob in remote) {
    final prev = localById[remoteJob.id];
    if (prev == null) {
      merged.add(remoteJob);
      continue;
    }
    final remotePlaceIds = remoteJob.places.map((p) => p.id).toSet();
    final places = <FieldPlace>[
      for (final place in remoteJob.places)
        FieldPlace(
          id: place.id,
          label: place.label,
          condition: _pickCondition(_placeById(prev.places, place.id)?.condition ?? "", place.condition),
          sortOrder: place.sortOrder,
          synced: true,
          before: _pickShot(_placeById(prev.places, place.id)?.before, place.before),
          after: _pickShot(_placeById(prev.places, place.id)?.after, place.after),
        ),
      for (final place in prev.places)
        if (!remotePlaceIds.contains(place.id)) place,
    ]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    merged.add(remoteJob.copyWith(synced: true, places: places));
  }
  for (final job in local) {
    if (!job.synced && !remoteIds.contains(job.id)) merged.add(job);
  }
  merged.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return merged;
}

class GalleryShotPlan {
  const GalleryShotPlan({
    required this.number,
    required this.placeId,
    required this.placeLabel,
    required this.role,
    required this.fileName,
    required this.mediaId,
  });

  final int number;
  final String placeId;
  final String placeLabel;
  final String role;
  final String fileName;
  final String mediaId;
}

List<GalleryShotPlan> galleryShotPlan(FieldJob job) {
  final places = [...job.places]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  final plans = <GalleryShotPlan>[];
  var number = 1;
  for (final place in places) {
    for (final role in const ["BEFORE", "AFTER"]) {
      final shot = place.shotFor(role);
      if (shot == null) continue;
      plans.add(
        GalleryShotPlan(
          number: number,
          placeId: place.id,
          placeLabel: place.label,
          role: role,
          fileName: galleryOrderedName(number, place.label, role),
          mediaId: shot.mediaId,
        ),
      );
      number += 1;
    }
  }
  return plans;
}

String galleryOrderedName(int number, String label, String role) {
  final roleLabel = role == "AFTER" ? "후" : "전";
  final place = _gallerySafe(label);
  return "${number.toString().padLeft(2, "0")} ${place.isEmpty ? "사진" : place} $roleLabel";
}

String galleryAlbumName(String title, DateTime createdAt) {
  final local = createdAt.toLocal();
  final month = local.month.toString().padLeft(2, "0");
  final day = local.day.toString().padLeft(2, "0");
  final name = _gallerySafe(title);
  final label = name.isEmpty ? "현장" : name;
  final album = "${local.year}.$month.$day $label";
  if (album.length <= 80) return album;
  return album.substring(0, 80).trim();
}

String _gallerySafe(String value) {
  return value.replaceAll(RegExp(r"""[\\/:*?"<>|]+"""), " ").replaceAll(RegExp(r"\s+"), " ").trim();
}
