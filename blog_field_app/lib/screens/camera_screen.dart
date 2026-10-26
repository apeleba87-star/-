import "dart:io";

import "package:camera/camera.dart";
import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";
import "condition_sheet.dart";

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key, required this.jobId, required this.placeId, required this.role});

  final String jobId;
  final String placeId;
  final String role;

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _controller;
  String? _error;
  String? _beforePath;
  var _opacity = 0.3;
  var _busy = false;
  XFile? _shot;

  bool get _after => widget.role == "AFTER";

  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _error = "카메라를 찾지 못했습니다.");
        return;
      }
      final back = cameras.where((c) => c.lensDirection == CameraLensDirection.back);
      final camera = back.isEmpty ? cameras.first : back.first;
      final controller = CameraController(camera, ResolutionPreset.max, enableAudio: false, imageFormatGroup: ImageFormatGroup.jpeg);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      if (_after) {
        final store = FieldScope.of(context);
        final job = store.jobs.where((item) => item.id == widget.jobId).firstOrNull;
        final place = job?.places.where((item) => item.id == widget.placeId).firstOrNull;
        _beforePath = await store.ensureLocalFile(place?.before);
      }
      if (!mounted) return;
      setState(() => _controller = controller);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = "카메라를 열지 못했습니다.");
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _take() async {
    final controller = _controller;
    if (controller == null || _busy || !controller.value.isInitialized) return;
    setState(() => _busy = true);
    try {
      final file = await controller.takePicture();
      if (!mounted) return;
      setState(() => _shot = file);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = "사진을 찍지 못했습니다.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _use() async {
    final shot = _shot;
    if (shot == null) return;
    setState(() => _busy = true);
    final store = FieldScope.of(context);
    await store.saveShot(jobId: widget.jobId, placeId: widget.placeId, role: widget.role, sourcePath: shot.path);
    if (!mounted) return;
    if (!_after) {
      final place = store.jobs.where((item) => item.id == widget.jobId).firstOrNull?.places
          .where((item) => item.id == widget.placeId)
          .firstOrNull;
      if (place != null && place.condition.trim().isEmpty) {
        final picked = await showConditionSheet(context, placeLabel: place.label, initial: "");
        if (!mounted) return;
        if (picked != null && picked.trim().isNotEmpty) {
          await store.setCondition(widget.jobId, widget.placeId, picked);
        }
      }
    }
    if (!mounted) return;
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final shot = _shot;
    final place = FieldScope.of(context).jobs.where((item) => item.id == widget.jobId).firstOrNull?.places
        .where((item) => item.id == widget.placeId)
        .firstOrNull;
    final preview = shot != null
        ? Image.file(File(shot.path), fit: BoxFit.contain)
        : controller == null || !controller.value.isInitialized
            ? const Center(child: CircularProgressIndicator())
            : ClipRect(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CameraPreview(controller),
                    if (_after && _beforePath != null)
                      Opacity(
                        opacity: _opacity,
                        child: Image.file(File(_beforePath!), fit: BoxFit.cover),
                      ),
                  ],
                ),
              );

    return Scaffold(
      appBar: AppBar(
        title: Text("${place?.label ?? "장소"} · ${_after ? "청소 후" : "청소 전"}"),
      ),
      body: Column(
        children: [
          if (_error != null) Padding(padding: const EdgeInsets.all(16), child: Text(_error!)),
          Expanded(child: preview),
          Material(
            color: Theme.of(context).colorScheme.surface,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: shot != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          FilledButton(onPressed: _busy ? null : _use, child: const Text("이 사진 사용")),
                          const SizedBox(height: 8),
                          OutlinedButton(
                            onPressed: _busy ? null : () => setState(() => _shot = null),
                            child: const Text("다시 찍기"),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_after)
                            Row(
                              children: [
                                const Text("전 사진"),
                                Expanded(
                                  child: Slider(
                                    value: _opacity,
                                    onChanged: (value) => setState(() => _opacity = value),
                                  ),
                                ),
                              ],
                            ),
                          if (_after && _beforePath == null)
                            const Padding(
                              padding: EdgeInsets.only(bottom: 8),
                              child: Text("이 폰에 청소 전 사진이 없어 겹쳐 보이지 않습니다."),
                            ),
                          FilledButton(
                            onPressed: _busy || controller == null ? null : _take,
                            child: const Text("촬영"),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension _First<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
