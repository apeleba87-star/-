import "dart:io";

import "package:flutter/material.dart";
import "package:go_router/go_router.dart";
import "package:share_plus/share_plus.dart";

import "../field_scope.dart";
import "../models/field_job.dart";

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key, required this.jobId});

  final String jobId;

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _paths = <String, String>{};
  var _loading = true;
  var _sharing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final store = FieldScope.of(context);
    final job = store.jobs.where((item) => item.id == widget.jobId).firstOrNull;
    if (job == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    for (final place in job.places) {
      for (final shot in [place.before, place.after]) {
        if (shot == null) continue;
        final path = await store.ensureLocalFile(shot);
        if (path != null) _paths[shot.mediaId] = path;
      }
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _share(FieldJob job) async {
    setState(() {
      _sharing = true;
      _error = null;
    });
    try {
      final store = FieldScope.of(context);
      await store.pushPending();
      final message = await store.reportMessage(job);
      if (!mounted) return;
      await SharePlus.instance.share(ShareParams(text: message));
    } catch (_) {
      if (mounted) setState(() => _error = "링크를 만들지 못했습니다. 인터넷 연결을 확인해 주세요.");
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = FieldScope.of(context).jobs.where((item) => item.id == widget.jobId).firstOrNull;
    if (job == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("청소 보고서")),
        body: const Center(child: Text("현장을 찾지 못했습니다.")),
      );
    }
    final places = [
      for (final place in ([...job.places]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder))))
        if (place.before != null || place.after != null) place,
    ];
    final done = places.isNotEmpty && places.every((place) => place.before != null && place.after != null);
    final status = done ? "청소 완료" : "청소 진행중";
    final heading = done ? "청소 완료 보고서" : "청소 진행 보고서";
    final space = job.name.trim().isEmpty ? job.title : job.name.trim();
    final issued = _date(DateTime.now());
    final period = _date(job.createdAt.toLocal());
    return Scaffold(
      appBar: AppBar(
        title: const Text("청소 보고서"),
        leading: IconButton(onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    const Text("청소 보고서", style: TextStyle(fontSize: 12, color: Color(0xFF71717A))),
                    const Spacer(),
                    Text(issued, style: const TextStyle(fontSize: 12, color: Color(0xFF71717A))),
                  ],
                ),
                const SizedBox(height: 8),
                Text(heading, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFF4F4F5), borderRadius: BorderRadius.circular(6)),
                  child: Text(status),
                ),
                const SizedBox(height: 12),
                _Row(label: "공간", value: space),
                _Row(label: "청소내용", value: job.serviceType),
                _Row(label: "청소기간", value: period),
                _Row(label: "상태", value: status),
                const SizedBox(height: 8),
                if (places.isEmpty) const Text("보여줄 전·후 사진이 없습니다."),
                for (var i = 0; i < places.length; i++) ...[
                  const SizedBox(height: 16),
                  Text(
                    "${(i + 1).toString().padLeft(2, "0")}  ${places[i].label}",
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  _PhotoBlock(label: "청소 전", path: _paths[places[i].before?.mediaId]),
                  _PhotoBlock(label: "청소 후", path: _paths[places[i].after?.mediaId]),
                ],
                const SizedBox(height: 20),
                const Text(
                  "보내기를 누르면 이 문구와 보고서 링크가 카카오톡으로 갑니다.",
                  style: TextStyle(color: Color(0xFF71717A)),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!),
                ],
              ],
            ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            onPressed: _loading || _sharing || places.isEmpty ? null : () => _share(job),
            child: Text(_sharing ? "링크 만드는 중…" : "고객에게 링크 보내기"),
          ),
        ),
      ),
    );
  }
}

String _date(DateTime value) {
  final month = value.month.toString().padLeft(2, "0");
  final day = value.day.toString().padLeft(2, "0");
  return "${value.year}.$month.$day";
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE4E4E7)))),
      child: Row(
        children: [
          SizedBox(width: 72, child: Text(label, style: const TextStyle(color: Color(0xFF71717A)))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _PhotoBlock extends StatelessWidget {
  const _PhotoBlock({required this.label, this.path});

  final String label;
  final String? path;

  @override
  Widget build(BuildContext context) {
    final file = path == null ? null : File(path!);
    final ready = file != null && file.existsSync();
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE4E4E7)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            TextSpan(
              children: [
                TextSpan(text: label, style: const TextStyle(fontWeight: FontWeight.w700)),
                TextSpan(
                  text: ready ? "  1장" : "  0장",
                  style: const TextStyle(color: Color(0xFFA1A1AA)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (ready)
            Image.file(file, height: 220, fit: BoxFit.contain)
          else
            const Text("없음", style: TextStyle(color: Color(0xFFA1A1AA))),
        ],
      ),
    );
  }
}

extension on Iterable<FieldJob> {
  FieldJob? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
