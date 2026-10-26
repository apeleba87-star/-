import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";
import "../models/field_job.dart";

class NaverGuideScreen extends StatefulWidget {
  const NaverGuideScreen({super.key, required this.jobId});

  final String jobId;

  @override
  State<NaverGuideScreen> createState() => _NaverGuideScreenState();
}

class _NaverGuideScreenState extends State<NaverGuideScreen> {
  var _index = 0;
  var _busy = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _publish());
  }

  Future<void> _publish() async {
    setState(() => _busy = true);
    await FieldScope.of(context).publishJobGallery(widget.jobId);
    if (!mounted) return;
    setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final job = FieldScope.of(context).jobs.where((item) => item.id == widget.jobId).firstOrNull;
    if (job == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("네이버에 넣기")),
        body: const Center(child: Text("현장을 찾지 못했습니다.")),
      );
    }
    final places = [
      for (final place in ([...job.places]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder))))
        if (place.before != null || place.after != null) place,
    ];
    if (places.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text("네이버에 넣기")),
        body: const Center(child: Text("넣을 사진이 없습니다.")),
      );
    }
    final index = _index.clamp(0, places.length - 1);
    final place = places[index];
    final plans = galleryShotPlan(job).where((item) => item.placeId == place.id).toList();
    final album = galleryAlbumName(job.title, job.createdAt);
    return Scaffold(
      appBar: AppBar(
        title: Text("${index + 1} / ${places.length}"),
        leading: IconButton(onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(album, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text("네이버에서 사진 첨부를 누른 뒤, 모든 미디어에서 이 폴더를 여세요."),
          const SizedBox(height: 20),
          Text(place.label, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          if (place.condition.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(place.condition),
          ],
          const SizedBox(height: 16),
          for (final plan in plans) Text(plan.fileName, style: const TextStyle(fontSize: 16)),
          if (plans.length < 2) const Padding(padding: EdgeInsets.only(top: 8), child: Text("전·후 중 없는 사진이 있습니다. 있는 사진만 체크하세요.")),
          const SizedBox(height: 12),
          const Text("이 문단을 붙여 넣은 뒤, 폴더에서 위에 적힌 사진만 체크하세요."),
          if (_busy) const Padding(padding: EdgeInsets.only(top: 16), child: LinearProgressIndicator()),
          if (_message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_message!)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FilledButton(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: _pasteText(place)));
                  setState(() => _message = "복사했습니다. 네이버에 붙여 넣으세요.");
                },
                child: const Text("이 문단 복사"),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: index == 0 ? null : () => setState(() { _index = index - 1; _message = null; }),
                      child: const Text("이전 장소"),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: index == places.length - 1 ? null : () => setState(() { _index = index + 1; _message = null; }),
                      child: const Text("다음 장소"),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _pasteText(FieldPlace place) {
    final condition = place.condition.trim();
    if (condition.isEmpty) return place.label;
    return "${place.label}\n$condition";
  }
}

extension on Iterable<FieldJob> {
  FieldJob? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
