import "dart:convert";
import "dart:io";
import "dart:math";

import "package:connectivity_plus/connectivity_plus.dart";
import "package:flutter/foundation.dart";
import "package:path/path.dart" as p;
import "package:path_provider/path_provider.dart";
import "package:supabase_flutter/supabase_flutter.dart";
import "package:uuid/uuid.dart";

import "../models/field_job.dart";
import "../services/phone_gallery.dart";
import "../services/preview_jpeg.dart";

const _bucket = "ai-blog-photos";
const _reportSite = "https://www.cleanidex.co.kr";
const _keepDays = 14;
const _maxPlaces = 40;
const _maxBytes = 20 * 1024 * 1024;
const _uuid = Uuid();

class FieldStore extends ChangeNotifier {
  List<FieldJob> jobs = [];
  bool loading = false;
  String? error;
  String? companyId;
  bool isAdmin = false;
  bool accessActive = false;
  String? blockReason;

  var _syncing = false;

  SupabaseClient get _client => Supabase.instance.client;
  SupabaseQuerySchema get _db => _client.schema("cleanidex");

  Future<void> bindSession() async {
    error = null;
    blockReason = null;
    final user = _client.auth.currentUser;
    if (user == null) {
      jobs = [];
      companyId = null;
      notifyListeners();
      return;
    }
    await _loadLocal(user.id);
    await refresh();
  }

  Future<void> refresh() async {
    final user = _client.auth.currentUser;
    if (user == null) return;
    loading = true;
    error = null;
    notifyListeners();
    try {
      await _loadAccess(user.id);
      if (companyId != null && (isAdmin || accessActive)) {
        final remote = await _fetchRemote();
        jobs = mergeJobs(jobs, remote);
        await _saveLocal(user.id);
        await pushPending();
        await _saveUnsavedToGallery();
      }
    } catch (e) {
      error = "현장을 불러오지 못했습니다.";
      debugPrint("$e");
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<String?> createJob(String name, String serviceType) async {
    if (!accessActive) {
      error = blockReason ?? "이용 기간에만 새 현장을 만들 수 있습니다.";
      notifyListeners();
      return null;
    }
    final job = FieldJob(
      id: _uuid.v4(),
      name: name.trim(),
      serviceType: serviceType.trim(),
      title: fieldJobTitle(dong: name.trim(), service: serviceType.trim()),
      createdAt: DateTime.now(),
    );
    jobs = [job, ...jobs];
    notifyListeners();
    await _saveLocal(_client.auth.currentUser!.id);
    await pushPending();
    return job.id;
  }

  Future<void> addPlace(String jobId, String label, {String condition = ""}) async {
    final name = label.trim();
    if (name.isEmpty) return;
    jobs = [
      for (final job in jobs)
        if (job.id != jobId)
          job
        else if (job.places.length >= _maxPlaces)
          job
        else
          job.copyWith(places: [
            ...job.places,
            FieldPlace(id: _uuid.v4(), label: name, condition: condition.trim(), sortOrder: job.places.length),
          ]),
    ];
    notifyListeners();
    await _saveLocal(_client.auth.currentUser!.id);
    await pushPending();
  }

  Future<void> setCondition(String jobId, String placeId, String condition) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    final text = condition.trim();
    jobs = [
      for (final job in jobs)
        if (job.id != jobId)
          job
        else
          job.copyWith(places: [
            for (final place in job.places)
              if (place.id != placeId) place else place.copyWith(condition: text),
          ]),
    ];
    notifyListeners();
    await _saveLocal(userId);
    await pushPending();
  }

  Future<void> saveShot({
    required String jobId,
    required String placeId,
    required String role,
    required String sourcePath,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    final destDir = Directory(p.join((await getApplicationDocumentsDirectory()).path, "shots"));
    await destDir.create(recursive: true);
    final job = _job(jobId);
    final place = job?.places.where((item) => item.id == placeId).firstOrNull;
    final previous = place?.shotFor(role);
    final mediaId = previous?.mediaId ?? _uuid.v4();
    final dest = p.join(destDir.path, "$mediaId.jpg");
    final bytes = await File(sourcePath).readAsBytes();
    await File(dest).writeAsBytes(bytes, flush: true);
    final shot = FieldShot(
      mediaId: mediaId,
      role: role,
      localPath: dest,
      upload: ShotUpload.local,
      galleryName: previous?.galleryName,
    );
    _replaceShot(jobId, placeId, role, shot);
    await publishJobGallery(jobId, refreshMediaId: mediaId);
    await _saveLocal(userId);
    await pushPending();
  }

  Future<void> publishJobGallery(String jobId, {String? refreshMediaId}) async {
    final userId = _client.auth.currentUser?.id;
    final job = _job(jobId);
    if (userId == null || job == null) return;
    final album = galleryAlbumName(job.title, job.createdAt);
    var changed = false;
    for (final plan in galleryShotPlan(job)) {
      final latest = _job(jobId)?.places.where((item) => item.id == plan.placeId).firstOrNull?.shotFor(plan.role);
      if (latest == null) continue;
      final current = latest.galleryName == plan.fileName && latest.gallerySaved;
      if (current && latest.mediaId != refreshMediaId) continue;
      final bytes = await _bytesForGallery(latest);
      if (bytes == null) continue;
      if (latest.galleryName != null) await deleteGalleryImage(album, latest.galleryName!);
      if (latest.galleryName != plan.fileName) await deleteGalleryImage(album, plan.fileName);
      final saved = await saveJpegToPhoneGallery(bytes, plan.fileName, album: album);
      if (!saved) continue;
      final afterSave = _job(jobId)?.places.where((item) => item.id == plan.placeId).firstOrNull?.shotFor(plan.role);
      if (afterSave == null) continue;
      _replaceShot(jobId, plan.placeId, plan.role, afterSave.copyWith(gallerySaved: true, galleryName: plan.fileName));
      changed = true;
    }
    if (changed) await _saveLocal(userId);
  }

  Future<void> _saveUnsavedToGallery() async {
    for (final job in List<FieldJob>.from(jobs)) {
      await publishJobGallery(job.id);
    }
  }

  Future<Uint8List?> _bytesForGallery(FieldShot shot) async {
    final local = shot.localPath;
    if (local != null && File(local).existsSync()) return File(local).readAsBytes();
    final downloaded = await ensureLocalFile(shot);
    if (downloaded == null) return null;
    return File(downloaded).readAsBytes();
  }

  Future<String?> ensureLocalFile(FieldShot? shot) async {
    if (shot == null) return null;
    final local = shot.localPath;
    if (local != null && File(local).existsSync()) return local;
    final storagePath = shot.storagePath;
    if (storagePath == null || storagePath.isEmpty) return null;
    if (shot.expiresAt != null && shot.expiresAt!.isBefore(DateTime.now())) return null;
    try {
      final bytes = await _client.storage.from(_bucket).download(storagePath);
      final destDir = Directory(p.join((await getApplicationDocumentsDirectory()).path, "shots"));
      await destDir.create(recursive: true);
      final dest = p.join(destDir.path, "${shot.mediaId}.jpg");
      await File(dest).writeAsBytes(bytes, flush: true);
      return dest;
    } catch (e) {
      debugPrint("download failed $e");
      return null;
    }
  }

  Future<void> pushPending() async {
    if (_syncing || companyId == null || !accessActive) return;
    if (!await _online()) return;
    _syncing = true;
    notifyListeners();
    try {
      final userId = _client.auth.currentUser!.id;
      for (final job in List<FieldJob>.from(jobs)) {
        await _pushJob(job);
      }
      await _saveLocal(userId);
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
    jobs = [];
    companyId = null;
    notifyListeners();
  }

  FieldJob? _job(String id) {
    for (final job in jobs) {
      if (job.id == id) return job;
    }
    return null;
  }

  void _replaceShot(String jobId, String placeId, String role, FieldShot shot) {
    jobs = [
      for (final job in jobs)
        if (job.id != jobId)
          job
        else
          job.copyWith(places: [
            for (final place in job.places)
              if (place.id != placeId)
                place
              else
                place.copyWith(
                  before: role == "BEFORE" ? shot : null,
                  after: role == "AFTER" ? shot : null,
                  clearBefore: false,
                  clearAfter: false,
                ),
          ]),
    ];
    notifyListeners();
  }

  Future<void> _pushJob(FieldJob job) async {
    if (!job.synced) {
      try {
        await _db.from("projects").insert({
          "id": job.id,
          "company_id": companyId,
          "service_type": job.serviceType,
          "region_dong": job.name,
          "created_by": _client.auth.currentUser!.id,
        });
        _markJob(job.id, synced: true);
      } catch (e) {
        if (!_duplicate(e)) {
          error = "현장을 올리지 못했습니다.";
          debugPrint("$e");
          return;
        }
        _markJob(job.id, synced: true);
      }
    }
    final current = _job(job.id);
    if (current == null) return;
    for (final place in current.places) {
      await _pushPlace(current.id, place);
    }
  }

  Future<void> _pushPlace(String jobId, FieldPlace place) async {
    if (!place.synced) {
      try {
        await _db.from("media_pairs").insert({
          "id": place.id,
          "project_id": jobId,
          "company_id": companyId,
          "label": place.label,
          "memo": place.condition,
          "sort_order": place.sortOrder,
        });
      } catch (e) {
        if (!_duplicate(e)) {
          debugPrint("pair $e");
          return;
        }
      }
      _markPlace(jobId, place.id, synced: true);
    }
    final latest = _job(jobId)?.places.where((item) => item.id == place.id).firstOrNull;
    if (latest == null) return;
    try {
      await _db.from("media_pairs").update({
        "label": latest.label,
        "memo": latest.condition,
        "sort_order": latest.sortOrder,
      }).eq("id", latest.id);
    } catch (e) {
      debugPrint("pair memo $e");
    }
    if (latest.before != null) await _pushShot(jobId, latest, latest.before!);
    if (latest.after != null) await _pushShot(jobId, latest, latest.after!);
  }

  Future<void> _pushShot(String jobId, FieldPlace place, FieldShot shot) async {
    if (shot.upload == ShotUpload.done || shot.localPath == null) return;
    final file = File(shot.localPath!);
    if (!file.existsSync()) return;
    final bytes = await file.readAsBytes();
    if (bytes.length > _maxBytes) {
      _replaceShot(
        jobId,
        place.id,
        shot.role,
        shot.copyWith(upload: ShotUpload.failed, error: "20MB를 넘는 사진은 올릴 수 없습니다."),
      );
      return;
    }
    _replaceShot(jobId, place.id, shot.role, shot.copyWith(upload: ShotUpload.uploading, clearError: true));
    final originalPath = "$companyId/ai-blog/$jobId/original/${shot.mediaId}.jpg";
    final previewPath = "$companyId/ai-blog/$jobId/preview/${shot.mediaId}.jpg";
    try {
      await _client.storage.from(_bucket).uploadBinary(
            originalPath,
            bytes,
            fileOptions: const FileOptions(contentType: "image/jpeg", upsert: true),
          );
      final preview = buildPreviewJpeg(bytes);
      if (preview != null) {
        await _client.storage.from(_bucket).uploadBinary(
              previewPath,
              preview,
              fileOptions: const FileOptions(contentType: "image/jpeg", upsert: true),
            );
      }
      final reportJpeg = buildReportJpeg(bytes);
      if (reportJpeg != null) {
        try {
          await _client.storage.from(_bucket).uploadBinary(
                "$companyId/ai-blog/$jobId/report/${shot.mediaId}.jpg",
                reportJpeg,
                fileOptions: const FileOptions(contentType: "image/jpeg", upsert: true),
              );
        } catch (e) {
          debugPrint("report jpeg $e");
        }
      }
      final expires = DateTime.now().toUtc().add(const Duration(days: _keepDays));
      final row = {
        "id": shot.mediaId,
        "project_id": jobId,
        "company_id": companyId,
        "media_type": shot.role,
        "sort_order": place.sortOrder,
        "space_type": place.label,
        "local_name": p.basename(shot.localPath!),
        "local_size": bytes.length,
        "storage_path": originalPath,
        "preview_path": preview == null ? null : previewPath,
        "original_expires_at": expires.toIso8601String(),
        "taken_at": DateTime.now().toUtc().toIso8601String(),
      };
      try {
        await _db.from("project_media").insert(row);
      } catch (e) {
        if (!_duplicate(e)) rethrow;
        await _db.from("project_media").update(row).eq("id", shot.mediaId);
      }
      await _db.from("media_pairs").update({
        shot.role == "AFTER" ? "after_media_id" : "before_media_id": shot.mediaId,
      }).eq("id", place.id);
      _replaceShot(
        jobId,
        place.id,
        shot.role,
        shot.copyWith(
          upload: ShotUpload.done,
          storagePath: originalPath,
          previewPath: preview == null ? null : previewPath,
          expiresAt: expires.toLocal(),
          clearError: true,
        ),
      );
    } catch (e) {
      debugPrint("upload $e");
      _replaceShot(
        jobId,
        place.id,
        shot.role,
        shot.copyWith(upload: ShotUpload.failed, error: "올리지 못했습니다. 다시 시도해 주세요."),
      );
    }
  }

  void _markJob(String id, {required bool synced}) {
    jobs = [for (final job in jobs) if (job.id == id) job.copyWith(synced: synced) else job];
  }

  void _markPlace(String jobId, String placeId, {required bool synced}) {
    jobs = [
      for (final job in jobs)
        if (job.id != jobId)
          job
        else
          job.copyWith(places: [
            for (final place in job.places)
              if (place.id == placeId) place.copyWith(synced: synced) else place,
          ]),
    ];
  }

  Future<void> _loadAccess(String userId) async {
    final contextRows = await _client.rpc("cleanidex_my_context");
    Map<String, dynamic>? context;
    if (contextRows is List && contextRows.isNotEmpty) {
      context = Map<String, dynamic>.from(contextRows.first as Map);
    } else if (contextRows is Map) {
      context = Map<String, dynamic>.from(contextRows);
    }
    companyId = context?["company_id"] as String?;
    final role = context?["role_code"] as String?;
    final profile = await _client.from("profiles").select("role").eq("id", userId).maybeSingle();
    final siteAdmin = profile != null && profile["role"] == "admin";
    isAdmin = siteAdmin || role == "admin";
    if (companyId == null) {
      accessActive = false;
      blockReason = "업체가 연결된 대표 계정으로 로그인해 주세요.";
      return;
    }
    if (!isAdmin) {
      accessActive = false;
      blockReason = "업체 대표 계정만 사용할 수 있습니다.";
      return;
    }
    if (siteAdmin) {
      accessActive = true;
      blockReason = null;
      return;
    }
    final access = await _db.from("ai_blog_access").select("status, expires_on").eq("user_id", userId).maybeSingle();
    if (access == null) {
      accessActive = false;
      blockReason = "AI 블로그 사용 권한이 없습니다.";
      return;
    }
    if (access["status"] == "suspended") {
      accessActive = false;
      blockReason = "AI 블로그 사용이 정지되었습니다.";
      return;
    }
    final expires = access["expires_on"] as String? ?? "";
    accessActive = expires.compareTo(_today()) >= 0;
    blockReason = accessActive ? null : "이용 기간이 끝났습니다. 이미 올린 현장은 볼 수 있습니다.";
  }

  Future<List<FieldJob>> _fetchRemote() async {
    final projectRows = await _db
        .from("projects")
        .select("id, service_type, region_sido, region_sigungu, region_dong, property_type, area_pyeong, created_at")
        .isFilter("deleted_at", null)
        .order("created_at", ascending: false);
    final pairRows = await _db.from("media_pairs").select("id, project_id, label, memo, before_media_id, after_media_id, sort_order");
    final mediaRows = await _db
        .from("project_media")
        .select("id, project_id, media_type, storage_path, preview_path, original_expires_at");
    final mediaById = <String, Map<String, dynamic>>{
      for (final raw in mediaRows as List) (raw as Map)["id"] as String: Map<String, dynamic>.from(raw),
    };
    final pairsByProject = <String, List<Map<String, dynamic>>>{};
    for (final raw in pairRows as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      pairsByProject.putIfAbsent(row["project_id"] as String, () => []).add(row);
    }
    return [
      for (final raw in projectRows as List)
        _jobFromRemote(Map<String, dynamic>.from(raw as Map), pairsByProject, mediaById),
    ];
  }

  FieldJob _jobFromRemote(
    Map<String, dynamic> row,
    Map<String, List<Map<String, dynamic>>> pairsByProject,
    Map<String, Map<String, dynamic>> mediaById,
  ) {
    final pairs = [...?pairsByProject[row["id"] as String]]..sort(
        (a, b) => ((a["sort_order"] as num?) ?? 0).compareTo((b["sort_order"] as num?) ?? 0),
      );
    return FieldJob(
      id: row["id"] as String,
      name: (row["region_dong"] as String?) ?? "",
      serviceType: (row["service_type"] as String?) ?? "",
      title: fieldJobTitle(
        sigungu: row["region_sigungu"] as String?,
        dong: row["region_dong"] as String?,
        property: row["property_type"] as String?,
        pyeong: row["area_pyeong"] as num?,
        service: (row["service_type"] as String?) ?? "",
      ),
      createdAt: DateTime.tryParse(row["created_at"] as String? ?? "") ?? DateTime.now(),
      synced: true,
      places: [
        for (final pair in pairs)
          FieldPlace(
            id: pair["id"] as String,
            label: (pair["label"] as String?) ?? "",
            condition: (pair["memo"] as String?) ?? "",
            sortOrder: (pair["sort_order"] as num?)?.toInt() ?? 0,
            synced: true,
            before: _shotFromMedia(mediaById[pair["before_media_id"]], "BEFORE"),
            after: _shotFromMedia(mediaById[pair["after_media_id"]], "AFTER"),
          ),
      ],
    );
  }

  FieldShot? _shotFromMedia(Map<String, dynamic>? row, String role) {
    if (row == null) return null;
    final storagePath = row["storage_path"] as String?;
    return FieldShot(
      mediaId: row["id"] as String,
      role: role,
      storagePath: storagePath,
      previewPath: row["preview_path"] as String?,
      upload: storagePath == null ? ShotUpload.done : ShotUpload.done,
      expiresAt: row["original_expires_at"] == null ? null : DateTime.tryParse(row["original_expires_at"] as String),
    );
  }

  Future<void> _loadLocal(String userId) async {
    final file = await _file(userId);
    if (!file.existsSync()) {
      jobs = [];
      return;
    }
    final decoded = jsonDecode(await file.readAsString());
    if (decoded is! List) {
      jobs = [];
      return;
    }
    jobs = [
      for (final raw in decoded) FieldJob.fromJson(Map<String, dynamic>.from(raw as Map)),
    ];
  }

  Future<void> _saveLocal(String userId) async {
    final file = await _file(userId);
    await file.writeAsString(jsonEncode(jobs.map((job) => job.toJson()).toList()));
  }

  Future<File> _file(String userId) async {
    final dir = await getApplicationDocumentsDirectory();
    return File(p.join(dir.path, "field_jobs_$userId.json"));
  }

  /// 카카오톡에 붙일 문구. 링크를 열면 고객용 보고서가 나온다.
  Future<String> reportMessage(FieldJob job) async {
    final url = await reportUrl(job.id);
    final manager = await _reportManager();
    final place = job.name.trim().isEmpty ? job.title : job.name.trim();
    final done = _reportDone(job);
    final status = done ? "청소 완료 보고입니다." : "청소 진행 현황입니다.";
    final text = StringBuffer()
      ..writeln("안녕하세요. $place $status")
      ..writeln("청소 전/후 사진과 보고서를 확인하세요.")
      ..writeln()
      ..writeln("▶ 보고서 보기")
      ..writeln(url);
    if (manager != null) {
      text
        ..writeln()
        ..write("담당 $manager");
    }
    return text.toString();
  }

  bool _reportDone(FieldJob job) {
    final places = job.places.where((place) => place.before != null || place.after != null);
    if (places.isEmpty) return false;
    return places.every((place) => place.before != null && place.after != null);
  }

  Future<String?> _reportManager() async {
    final company = companyId;
    if (company == null) return null;
    try {
      final row = await _db
          .from("business_profiles")
          .select("owner_name, business_name")
          .eq("company_id", company)
          .maybeSingle();
      final owner = (row?["owner_name"] as String?)?.trim() ?? "";
      if (owner.isNotEmpty) return owner;
      final business = (row?["business_name"] as String?)?.trim() ?? "";
      return business.isEmpty ? null : business;
    } catch (error) {
      debugPrint("report manager $error");
      return null;
    }
  }

  /// 고객이 로그인 없이 전·후 보고서를 여는 주소. 현장마다 하나다.
  Future<String> reportUrl(String jobId) async {
    final company = companyId;
    if (company == null) throw StateError("회사 정보가 없습니다.");
    final existing = await _db.from("field_report_links").select("token").eq("project_id", jobId).maybeSingle();
    var token = existing == null ? null : existing["token"] as String?;
    if (token == null || token.isEmpty) {
      token = _reportToken();
      try {
        await _db.from("field_report_links").insert({
          "project_id": jobId,
          "company_id": company,
          "token": token,
        });
      } catch (error) {
        if (!_duplicate(error)) rethrow;
        final again = await _db.from("field_report_links").select("token").eq("project_id", jobId).maybeSingle();
        token = again == null ? null : again["token"] as String?;
      }
    }
    if (token == null || token.isEmpty) throw StateError("링크를 만들지 못했습니다.");
    return "$_reportSite/report/$token";
  }

  String _reportToken() {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    final random = Random.secure();
    return List.generate(24, (_) => alphabet[random.nextInt(alphabet.length)]).join();
  }

  Future<bool> _online() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  bool _duplicate(Object error) {
    final text = error.toString();
    return text.contains("23505") || text.contains("duplicate key");
  }

  String _today() {
    final now = DateTime.now();
    final month = now.month.toString().padLeft(2, "0");
    final day = now.day.toString().padLeft(2, "0");
    return "${now.year}-$month-$day";
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
