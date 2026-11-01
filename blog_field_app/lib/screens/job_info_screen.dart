import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "../field_scope.dart";
import "../models/field_job.dart";
import "../services/business_profile.dart";

const _propertyTypes = ["아파트", "빌라", "오피스텔", "단독주택", "상가", "사무실", "기타"];

class JobInfoScreen extends StatefulWidget {
  const JobInfoScreen({super.key, required this.jobId});

  final String jobId;

  @override
  State<JobInfoScreen> createState() => _JobInfoScreenState();
}

class _JobInfoScreenState extends State<JobInfoScreen> {
  final _sido = TextEditingController();
  final _sigungu = TextEditingController();
  final _dong = TextEditingController();
  final _pyeong = TextEditingController();
  final _workers = TextEditingController();
  final _hours = TextEditingController();
  final _price = TextEditingController();
  final _description = TextEditingController();
  String _service = kServiceTypeOptions.first;
  String _property = _propertyTypes.first;
  String _workDate = "";
  var _saving = false;
  var _saved = false;
  String? _error;
  var _ready = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _hydrate());
  }

  @override
  void dispose() {
    _sido.dispose();
    _sigungu.dispose();
    _dong.dispose();
    _pyeong.dispose();
    _workers.dispose();
    _hours.dispose();
    _price.dispose();
    _description.dispose();
    super.dispose();
  }

  FieldJob? get _job {
    final store = FieldScope.of(context);
    for (final job in store.jobs) {
      if (job.id == widget.jobId) return job;
    }
    return null;
  }

  void _hydrate() {
    final job = _job;
    if (job == null) {
      setState(() => _ready = true);
      return;
    }
    _service = job.serviceType.isNotEmpty ? job.serviceType : kServiceTypeOptions.first;
    _sido.text = job.regionSido ?? "";
    _sigungu.text = job.regionSigungu ?? "";
    _dong.text = (job.regionDong?.isNotEmpty == true) ? job.regionDong! : job.name;
    _property = (job.propertyType != null && job.propertyType!.isNotEmpty) ? job.propertyType! : _propertyTypes.first;
    _pyeong.text = job.areaPyeong == null ? "" : _trimNum(job.areaPyeong!);
    _workers.text = job.workerCount?.toString() ?? "";
    _hours.text = job.workMinutes == null ? "" : _trimNum(job.workMinutes! / 60);
    _price.text = job.price == null ? "" : _formatWonDigits(job.price!.toString());
    _workDate = (job.workDate != null && job.workDate!.isNotEmpty)
        ? job.workDate!.substring(0, job.workDate!.length >= 10 ? 10 : job.workDate!.length)
        : DateTime.now().toIso8601String().substring(0, 10);
    _description.text = job.description ?? "";
    setState(() => _ready = true);
  }

  String _trimNum(num n) {
    if (n == n.roundToDouble()) return n.toInt().toString();
    return n.toStringAsFixed(1);
  }

  String _formatWonDigits(String digits) {
    final only = digits.replaceAll(RegExp(r"\D"), "");
    if (only.isEmpty) return "";
    final clipped = only.replaceFirst(RegExp(r"^0+(?=\d)"), "").substring(0, only.length.clamp(0, 10));
    final value = int.tryParse(clipped) ?? 0;
    return value.toString().replaceAllMapped(RegExp(r"\B(?=(\d{3})+(?!\d))"), (_) => ",");
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_workDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale("ko", "KR"),
    );
    if (picked == null) return;
    final m = picked.month.toString().padLeft(2, "0");
    final d = picked.day.toString().padLeft(2, "0");
    setState(() {
      _saved = false;
      _workDate = "${picked.year}-$m-$d";
    });
  }

  Future<void> _save() async {
    final store = FieldScope.of(context);
    final pyeongRaw = _pyeong.text.trim();
    final workersRaw = _workers.text.trim();
    final hoursRaw = _hours.text.trim();
    final priceDigits = _price.text.replaceAll(RegExp(r"\D"), "");
    final hours = double.tryParse(hoursRaw);
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
    });
    final err = await store.updateJobInfo(
      jobId: widget.jobId,
      serviceType: _service,
      regionSido: _sido.text,
      regionSigungu: _sigungu.text,
      regionDong: _dong.text,
      propertyType: _property,
      areaPyeong: pyeongRaw.isEmpty ? null : double.tryParse(pyeongRaw),
      workerCount: workersRaw.isEmpty ? null : int.tryParse(workersRaw),
      workMinutes: hours != null && hours > 0 ? (hours * 60).round() : null,
      price: priceDigits.isEmpty ? null : int.tryParse(priceDigits),
      workDate: _workDate,
      description: _description.text,
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (err != null) {
        _error = err;
      } else {
        _saved = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_job == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("현장 정보")),
        body: const Center(child: Text("현장을 찾지 못했습니다.")),
      );
    }

    final services = {...kServiceTypeOptions, if (_service.isNotEmpty) _service}.toList();

    return Scaffold(
      appBar: AppBar(title: const Text("현장 정보")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            "웹과 같은 현장 기록입니다. 금액은 업체만 보고, 블로그 글에는 들어가지 않습니다.",
            style: TextStyle(fontSize: 13, color: Color(0xFF71717A)),
          ),
          if (_saved) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: const Text("저장했습니다.", style: TextStyle(color: Color(0xFF065F46))),
            ),
          ],
          const SizedBox(height: 16),
          const Text("청소 종류", style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final item in services)
                ChoiceChip(
                  label: Text(item),
                  selected: _service == item,
                  onSelected: (_) => setState(() {
                    _saved = false;
                    _service = item;
                  }),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _label("시/도"),
          TextField(
            controller: _sido,
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "서울"),
          ),
          const SizedBox(height: 12),
          _label("구/군"),
          TextField(
            controller: _sigungu,
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "강서구"),
          ),
          const SizedBox(height: 12),
          _label("동"),
          TextField(
            controller: _dong,
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "마곡동"),
          ),
          const SizedBox(height: 16),
          const Text("건물 유형", style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final item in _propertyTypes)
                ChoiceChip(
                  label: Text(item),
                  selected: _property == item,
                  onSelected: (_) => setState(() {
                    _saved = false;
                    _property = item;
                  }),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _label("평수"),
          TextField(
            controller: _pyeong,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "34"),
          ),
          const SizedBox(height: 12),
          _label("작업 인원"),
          TextField(
            controller: _workers,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "3"),
          ),
          const SizedBox(height: 12),
          _label("작업시간 (시간)"),
          TextField(
            controller: _hours,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "1.5"),
          ),
          const SizedBox(height: 12),
          _label("작업일"),
          OutlinedButton(
            onPressed: _pickDate,
            style: OutlinedButton.styleFrom(
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            ),
            child: Row(
              children: [
                Expanded(child: Text(_workDate.isEmpty ? "날짜 선택" : _workDate)),
                const Icon(Icons.calendar_today_outlined, size: 18),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _label("금액 (선택)"),
          TextField(
            controller: _price,
            keyboardType: TextInputType.number,
            onChanged: (value) {
              final formatted = _formatWonDigits(value);
              if (formatted != value) {
                _price.value = TextEditingValue(
                  text: formatted,
                  selection: TextSelection.collapsed(offset: formatted.length),
                );
              }
              setState(() => _saved = false);
            },
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: "400,000",
              suffixText: "원",
            ),
          ),
          const SizedBox(height: 12),
          _label("특이사항 · 추가 설명"),
          TextField(
            controller: _description,
            minLines: 3,
            maxLines: 5,
            onChanged: (_) => setState(() => _saved = false),
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: "예: 공사 후 분진이 많았음",
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? "저장 중…" : "저장"),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      );
}
