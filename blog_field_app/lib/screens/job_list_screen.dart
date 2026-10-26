import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";

class JobListScreen extends StatelessWidget {
  const JobListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
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
              onPressed: store.accessActive ? () => context.push("/jobs/new") : null,
              child: const Text("현장 만들기"),
            ),
            const SizedBox(height: 8),
            const Text("원본은 완료하거나 14일이 지나면 작은 미리보기만 남습니다."),
            const SizedBox(height: 12),
            if (store.loading && store.jobs.isEmpty) const LinearProgressIndicator(),
            if (!store.loading && store.jobs.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: Text("현장을 만들고 청소 전 사진을 찍으세요."),
              ),
            for (final job in store.jobs)
              Card(
                child: ListTile(
                  title: Text(job.title),
                  subtitle: Text("장소 ${job.places.length}곳 · 전후 ${job.pairCount}짝\n${job.statusLabel}"),
                  isThreeLine: true,
                  onTap: () => context.push("/jobs/${job.id}"),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
