import "dart:io";

import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../data/field_store.dart";
import "../field_scope.dart";
import "../models/field_job.dart";
import "condition_sheet.dart";

class PlaceListScreen extends StatelessWidget {
  const PlaceListScreen({super.key, required this.jobId});

  final String jobId;

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
    final job = store.jobs.where((item) => item.id == jobId).firstOrNull;
    if (job == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("현장")),
        body: const Center(child: Text("현장을 찾지 못했습니다.")),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(job.title),
        leading: IconButton(onPressed: () => context.go("/"), icon: const Icon(Icons.arrow_back)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text("원본은 14일 후 미리보기만 남습니다."),
          const SizedBox(height: 12),
          for (final place in job.places) _PlaceCard(jobId: job.id, place: place),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: job.places.any((place) => place.before != null || place.after != null)
                ? () => context.push("/jobs/${job.id}/naver")
                : null,
            child: const Text("네이버에 넣기"),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: job.places.any((place) => place.before != null || place.after != null)
                ? () => context.push("/jobs/${job.id}/report")
                : null,
            child: const Text("청소 보고서"),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: store.accessActive ? () => _addPlace(context, store) : null,
            child: const Text("장소 추가"),
          ),
        ],
      ),
    );
  }

  Future<void> _addPlace(BuildContext context, FieldStore store) async {
    final created = await showAddPlaceSheet(context);
    if (created == null || created.label.trim().isEmpty) return;
    await store.addPlace(jobId, created.label, condition: created.condition);
  }
}

class _PlaceCard extends StatelessWidget {
  const _PlaceCard({required this.jobId, required this.place});

  final String jobId;
  final FieldPlace place;

  @override
  Widget build(BuildContext context) {
    final before = place.before != null;
    final after = place.after != null;
    final action = !before ? "청소 전 찍기" : !after ? "청소 후 찍기" : "다시 찍기";
    final role = !before ? "BEFORE" : "AFTER";
    final upload = _uploadLabel(place);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(place.label, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            _ConditionLine(
              condition: place.condition,
              onTap: () => _editCondition(context, jobId, place),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _Thumb(label: "전", path: place.before?.localPath)),
                const SizedBox(width: 8),
                Expanded(child: _Thumb(label: "후", path: place.after?.localPath)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: Text(upload)),
                FilledButton(
                  onPressed: () => context.push("/jobs/$jobId/places/${place.id}/$role"),
                  child: Text(action),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.label, this.path});

  final String label;
  final String? path;

  @override
  Widget build(BuildContext context) {
    final file = path == null ? null : File(path!);
    final hasFile = file != null && file.existsSync();
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        height: 120,
        width: double.infinity,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
            borderRadius: BorderRadius.circular(8),
          ),
          child: hasFile
              ? Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.file(file, key: ValueKey(path), fit: BoxFit.cover),
                    Align(
                      alignment: Alignment.bottomLeft,
                      child: ColoredBox(
                        color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.85),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          child: Text(label, style: const TextStyle(fontSize: 12)),
                        ),
                      ),
                    ),
                  ],
                )
              : Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(padding: const EdgeInsets.all(8), child: Text("$label · 비어 있음")),
                ),
        ),
      ),
    );
  }
}

Future<void> _editCondition(BuildContext context, String jobId, FieldPlace place) async {
  final store = FieldScope.of(context);
  final next = await showConditionSheet(context, placeLabel: place.label, initial: place.condition);
  if (next == null) return;
  await store.setCondition(jobId, place.id, next);
}

class _ConditionLine extends StatelessWidget {
  const _ConditionLine({required this.condition, required this.onTap});

  final String condition;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final empty = condition.trim().isEmpty;
    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton(
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        onPressed: onTap,
        child: Text(empty ? "오염 상태 고르기" : condition),
      ),
    );
  }
}

String _uploadLabel(FieldPlace place) {
  final shots = [place.before, place.after].whereType<FieldShot>();
  if (shots.isEmpty) return "사진 없음";
  if (shots.any((s) => s.upload == ShotUpload.failed)) return shots.map((s) => s.error).whereType<String>().join(" ");
  if (shots.any((s) => s.upload == ShotUpload.uploading)) return "올리는 중";
  if (shots.any((s) => s.upload == ShotUpload.local)) {
    return shots.every((s) => s.gallerySaved) ? "휴대폰 갤러리에 저장됨" : "갤러리에 저장하지 못함";
  }
  final onPhone = shots.every((s) => s.gallerySaved);
  if (onPhone) return "휴대폰 갤러리와 서버에 저장됨";
  return "서버에만 있음";
}

extension on Iterable<FieldJob> {
  FieldJob? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
