import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";
import "../models/field_job.dart";
import "../theme/app_theme.dart";
import "../widgets/account_nav.dart";
import "../widgets/brand_logo.dart";

class JobListScreen extends StatefulWidget {
  const JobListScreen({super.key});

  @override
  State<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends State<JobListScreen> {
  JobListBucket _bucket = JobListBucket.writing;

  Future<void> _confirmDelete(FieldJob job) async {
    final store = FieldScope.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("현장 삭제"),
        content: Text("「${job.title}」을(를) 삭제할까요?\n목록에서 사라지고, 연결된 글도 보이지 않습니다."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("취소")),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("삭제하기"),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final err = await store.deleteJob(job.id);
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
    final writing = store.jobsInBucket(JobListBucket.writing);
    final done = store.jobsInBucket(JobListBucket.done);
    final other = store.jobsInBucket(JobListBucket.other);
    final shown = switch (_bucket) {
      JobListBucket.writing => writing,
      JobListBucket.done => done,
      JobListBucket.other => other,
    };
    final emptyHint = switch (_bucket) {
      JobListBucket.writing => "PC에서 글을 만들거나 다듬는 현장이 여기에 모입니다.",
      JobListBucket.done => "글쓰기를 마친 현장이 여기에 모입니다.",
      JobListBucket.other => "아직 글이 없거나 보관한 현장이 여기에 모입니다. 여기서만 삭제할 수 있습니다.",
    };
    final text = Theme.of(context).textTheme;
    final showDelete = _bucket == JobListBucket.other && store.canManageJobs;

    return Scaffold(
      appBar: brandAppBar(title: "현장"),
      bottomNavigationBar: accountBottomNav(context, selectedIndex: 0),
      body: RefreshIndicator(
        onRefresh: store.refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.md, AppSpace.md, AppSpace.xl),
          children: [
            if (store.blockReason != null)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: Text(store.blockReason!, style: text.bodyLarge?.copyWith(color: AppColors.danger)),
              ),
            if (store.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: Text(store.error!, style: text.bodyLarge?.copyWith(color: AppColors.danger)),
              ),
            FilledButton(
              onPressed: store.canManageJobs ? () => context.push("/jobs/new") : null,
              child: const Text("현장 만들기"),
            ),
            const SizedBox(height: AppSpace.xs),
            Text(
              "원본은 14일이 지나면 미리보기만 남습니다.",
              style: text.bodySmall,
            ),
            const SizedBox(height: AppSpace.lg),
            SegmentedButton<JobListBucket>(
              segments: [
                ButtonSegment(value: JobListBucket.writing, label: Text("쓰는중 (${writing.length})")),
                ButtonSegment(value: JobListBucket.done, label: Text("완료 (${done.length})")),
                ButtonSegment(value: JobListBucket.other, label: Text("기타 (${other.length})")),
              ],
              selected: {_bucket},
              onSelectionChanged: (next) {
                if (next.isEmpty) return;
                setState(() => _bucket = next.first);
              },
              showSelectedIcon: false,
            ),
            const SizedBox(height: AppSpace.md),
            if (store.loading && store.jobs.isEmpty) const LinearProgressIndicator(),
            if (!store.loading && shown.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xl),
                child: Text(emptyHint, style: text.bodyLarge?.copyWith(color: AppColors.muted)),
              ),
            for (final job in shown)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Opacity(
                  opacity: _bucket == JobListBucket.done ? 0.88 : 1,
                  child: Material(
                    color: AppColors.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppSpace.radius),
                      side: const BorderSide(color: AppColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(AppSpace.radius),
                          onTap: () => context.push("/jobs/${job.id}"),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(job.title, style: text.titleMedium),
                                      const SizedBox(height: 6),
                                      Text(
                                        "장소 ${job.places.length}곳 · 전후 ${job.pairCount}짝",
                                        style: text.bodySmall,
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 6,
                                        crossAxisAlignment: WrapCrossAlignment.center,
                                        children: [
                                          _StatusChip(
                                            label: job.contentStatus?.badgeLabel ?? "글 없음",
                                            emphasize: job.contentStatus == ContentWriteStatus.drafting ||
                                                job.contentStatus == ContentWriteStatus.ready,
                                          ),
                                          Text(job.statusLabel, style: text.bodySmall),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: AppColors.faint, size: 28),
                              ],
                            ),
                          ),
                        ),
                        if (showDelete)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.danger,
                                  side: const BorderSide(color: Color(0xFFFECACA), width: 1.5),
                                  visualDensity: VisualDensity.compact,
                                ),
                                onPressed: () => _confirmDelete(job),
                                child: const Text("삭제하기"),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, this.emphasize = false});

  final String label;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: emphasize ? AppColors.primarySoft : AppColors.chip,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: emphasize ? AppColors.primary : AppColors.muted,
        ),
      ),
    );
  }
}
