import "dart:io";

import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../data/field_store.dart";
import "../field_scope.dart";
import "../models/field_job.dart";
import "../theme/app_theme.dart";
import "condition_sheet.dart";

class PlaceListScreen extends StatefulWidget {
  const PlaceListScreen({super.key, required this.jobId});

  final String jobId;

  @override
  State<PlaceListScreen> createState() => _PlaceListScreenState();
}

class _PlaceListScreenState extends State<PlaceListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      FieldScope.of(context).ensureJobDetails(widget.jobId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
    final text = Theme.of(context).textTheme;
    final job = store.jobs.where((item) => item.id == widget.jobId).firstOrNull;
    if (job == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("현장")),
        body: const Center(child: Text("현장을 찾지 못했습니다.")),
      );
    }
    final hasShots = job.places.any((place) => place.before != null || place.after != null);
    return Scaffold(
      appBar: AppBar(
        title: Text(job.title),
        leading: IconButton(onPressed: () => context.go("/"), icon: const Icon(Icons.arrow_back)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.md, AppSpace.md, AppSpace.xl),
        children: [
          Text("원본은 14일 후 미리보기만 남습니다.", style: text.bodySmall),
          const SizedBox(height: AppSpace.md),
          Material(
            color: AppColors.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpace.radius),
              side: const BorderSide(color: AppColors.line),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              title: const Text("현장 정보"),
              subtitle: Text(() {
                final bits = [
                  if (job.price != null)
                    "${job.price!.toString().replaceAllMapped(RegExp(r"\B(?=(\d{3})+(?!\d))"), (_) => ",")}원",
                  if (job.workerCount != null) "${job.workerCount}명",
                  if (job.areaPyeong != null) "${job.areaPyeong}평",
                ];
                return bits.isEmpty ? "평수·인원·금액 입력" : bits.join(" · ");
              }()),
              trailing: const Icon(Icons.chevron_right, size: 28),
              onTap: () => context.push("/jobs/${job.id}/info"),
            ),
          ),
          const SizedBox(height: AppSpace.md),
          for (final place in job.places) _PlaceCard(jobId: job.id, place: place),
          const SizedBox(height: AppSpace.sm),
          OutlinedButton(
            onPressed: store.canManageJobs ? () => _addPlace(context, store) : null,
            child: const Text("장소 추가"),
          ),
          const SizedBox(height: AppSpace.sm),
          OutlinedButton(
            onPressed: hasShots ? () => context.push("/jobs/${job.id}/naver") : null,
            child: const Text("네이버에 넣기"),
          ),
          const SizedBox(height: AppSpace.sm),
          OutlinedButton(
            onPressed: hasShots ? () => context.push("/jobs/${job.id}/report") : null,
            child: const Text("청소 보고서"),
          ),
        ],
      ),
    );
  }

  Future<void> _addPlace(BuildContext context, FieldStore store) async {
    final created = await showAddPlaceSheet(context);
    if (created == null || created.label.trim().isEmpty) return;
    await store.addPlace(widget.jobId, created.label, condition: created.condition);
  }
}

class _PlaceCard extends StatelessWidget {
  const _PlaceCard({required this.jobId, required this.place});

  final String jobId;
  final FieldPlace place;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final before = place.before != null;
    final after = place.after != null;
    final action = !before ? "청소 전 찍기" : !after ? "청소 후 찍기" : "다시 찍기";
    final role = !before ? "BEFORE" : "AFTER";
    final upload = _uploadLabel(place);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(place.label, style: text.titleMedium),
            if (place.condition.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(place.condition, style: text.bodySmall),
            ],
            if (upload != null) ...[
              const SizedBox(height: 4),
              Text(
                upload,
                style: text.bodySmall?.copyWith(
                  color: upload.contains("실패") ? AppColors.danger : AppColors.muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _Thumb(shot: place.before, empty: "전")),
                const SizedBox(width: 10),
                Expanded(child: _Thumb(shot: place.after, empty: "후")),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.push("/jobs/$jobId/places/${place.id}/$role"),
              child: Text(action),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () => _editCondition(context),
                child: const Text("오염 상태 적기"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? _uploadLabel(FieldPlace place) {
    final shots = [place.before, place.after].whereType<FieldShot>();
    if (shots.any((s) => s.upload == ShotUpload.failed)) return "올리기 실패";
    if (shots.any((s) => s.upload == ShotUpload.uploading)) return "올리는 중";
    if (shots.any((s) => s.upload == ShotUpload.local)) return "아직 폰에만 있음";
    return null;
  }

  Future<void> _editCondition(BuildContext context) async {
    final next = await showConditionSheet(context, placeLabel: place.label, initial: place.condition);
    if (next == null || !context.mounted) return;
    await FieldScope.of(context).setCondition(jobId, place.id, next);
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.shot, required this.empty});

  final FieldShot? shot;
  final String empty;

  @override
  Widget build(BuildContext context) {
    final path = shot?.localPath;
    final file = path != null ? File(path) : null;
    return AspectRatio(
      aspectRatio: 1,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.chip,
          borderRadius: BorderRadius.circular(AppSpace.radius),
          border: Border.all(color: AppColors.line),
        ),
        child: file != null && file.existsSync()
            ? ClipRRect(
                borderRadius: BorderRadius.circular(AppSpace.radius),
                child: Image.file(file, key: ValueKey(path), fit: BoxFit.cover),
              )
            : Center(
                child: Text(
                  empty,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.faint),
                ),
              ),
      ),
    );
  }
}
