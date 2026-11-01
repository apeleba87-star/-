import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";
import "../models/field_job.dart";

class JobListScreen extends StatefulWidget {
  const JobListScreen({super.key});

  @override
  State<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends State<JobListScreen> {
  JobListBucket _bucket = JobListBucket.writing;

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
      JobListBucket.other => "아직 글이 없거나 보관한 현장이 여기에 모입니다.",
    };

    return Scaffold(
      appBar: AppBar(title: const Text("현장")),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: "현장"),
          NavigationDestination(icon: Icon(Icons.person_outline), label: "내 정보"),
        ],
        onDestinationSelected: (index) {
          if (index == 1) context.go("/account");
        },
      ),
      body: RefreshIndicator(
        onRefresh: store.refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (store.blockReason != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(store.blockReason!),
              ),
            if (store.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(store.error!),
              ),
            FilledButton(
              onPressed: store.canManageJobs ? () => context.push("/jobs/new") : null,
              child: const Text("현장 만들기"),
            ),
            const SizedBox(height: 8),
            const Text("원본은 완료하거나 14일이 지나면 작은 미리보기만 남습니다."),
            const SizedBox(height: 16),
            SegmentedButton<JobListBucket>(
              segments: [
                ButtonSegment(
                  value: JobListBucket.writing,
                  label: Text("쓰는 중 (${writing.length})", style: const TextStyle(fontSize: 12)),
                ),
                ButtonSegment(
                  value: JobListBucket.done,
                  label: Text("완료 (${done.length})", style: const TextStyle(fontSize: 12)),
                ),
                ButtonSegment(
                  value: JobListBucket.other,
                  label: Text("기타 (${other.length})", style: const TextStyle(fontSize: 12)),
                ),
              ],
              selected: {_bucket},
              onSelectionChanged: (next) {
                if (next.isEmpty) return;
                setState(() => _bucket = next.first);
              },
              showSelectedIcon: false,
            ),
            const SizedBox(height: 12),
            if (store.loading && store.jobs.isEmpty) const LinearProgressIndicator(),
            if (!store.loading && shown.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: Text(emptyHint, style: const TextStyle(color: Color(0xFF71717A))),
              ),
            for (final job in shown)
              Opacity(
                opacity: _bucket == JobListBucket.done ? 0.85 : 1,
                child: Card(
                  child: ListTile(
                    title: Text(job.title),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text("장소 ${job.places.length}곳 · 전후 ${job.pairCount}짝"),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _Badge(
                              label: job.contentStatus?.badgeLabel ?? "글 없음",
                              emphasize: job.contentStatus == ContentWriteStatus.drafting ||
                                  job.contentStatus == ContentWriteStatus.ready,
                            ),
                            Text(
                              job.statusLabel,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF71717A)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    isThreeLine: true,
                    onTap: () => context.push("/jobs/${job.id}"),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, this.emphasize = false});

  final String label;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final bg = emphasize ? const Color(0xFFECFDF5) : const Color(0xFFF4F4F5);
    final fg = emphasize ? const Color(0xFF047857) : const Color(0xFF52525B);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}
