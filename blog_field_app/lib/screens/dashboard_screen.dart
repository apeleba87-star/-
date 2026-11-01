import "package:flutter/material.dart";

import "../field_scope.dart";
import "../services/month_stats.dart";
import "../theme/app_theme.dart";
import "../widgets/account_nav.dart";
import "../widgets/brand_logo.dart";

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late String _month;
  var _loading = true;
  String? _error;
  MonthSummary _summary = const MonthSummary(count: 0, revenue: 0, pricedCount: 0, missing: 0);

  @override
  void initState() {
    super.initState();
    _month = kstToday().substring(0, 7);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final store = FieldScope.of(context);
    if (!store.canManageJobs) {
      setState(() {
        _loading = false;
        _error = store.blockReason ?? "업체가 연결된 대표 계정으로 로그인해 주세요.";
        _summary = const MonthSummary(count: 0, revenue: 0, pricedCount: 0, missing: 0);
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final projects = await store.loadStatsProjects();
      final monthRows = projects.where((p) => workDay(p).startsWith(_month)).toList();
      if (!mounted) return;
      setState(() {
        _loading = false;
        _summary = summarize(monthRows);
      });
    } catch (e) {
      debugPrint("dashboard $e");
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "현황을 불러오지 못했습니다. 아래로 당겨 다시 시도해 주세요.";
      });
    }
  }

  void _shift(int delta) {
    final next = shiftMonth(_month, delta);
    final thisMonth = kstToday().substring(0, 7);
    if (next.compareTo(thisMonth) > 0) return;
    setState(() => _month = next);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final thisMonth = kstToday().substring(0, 7);
    final canNext = _month.compareTo(thisMonth) < 0;

    return Scaffold(
      appBar: brandAppBar(title: "현황"),
      bottomNavigationBar: accountBottomNav(context, selectedIndex: 1),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => _shift(-1),
                  iconSize: 32,
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Text(
                    monthLabel(_month),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  onPressed: canNext ? () => _shift(1) : null,
                  iconSize: 32,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              "웹 AI 블로그와 같은 월 매출 요약입니다.",
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            if (_loading) ...[
              const SizedBox(height: 24),
              const Center(child: CircularProgressIndicator()),
            ] else ...[
              const SizedBox(height: 16),
              _Kpi(label: "이번 달 매출", value: formatManwon(_summary.revenue)),
              const SizedBox(height: 10),
              _Kpi(label: "현장 수", value: "${_summary.count}건"),
              const SizedBox(height: 10),
              _Kpi(
                label: "금액 입력",
                value: "${_summary.pricedCount}건",
                sub: _summary.missing > 0 ? "미입력 ${_summary.missing}건 (금액·인원·시간)" : "모두 입력됨",
              ),
              if (_summary.avgPrice != null) ...[
                const SizedBox(height: 10),
                _Kpi(label: "건당 평균", value: formatWon(_summary.avgPrice!)),
              ],
              if (_summary.perManHour != null) ...[
                const SizedBox(height: 10),
                _Kpi(label: "인시당", value: formatWon(_summary.perManHour!)),
              ],
              if (_summary.count == 0) ...[
                const SizedBox(height: 24),
                const Text("이 달 현장이 없습니다.", style: TextStyle(color: Color(0xFF71717A))),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, this.sub});

  final String label;
  final String value;
  final String? sub;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpace.radius),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: AppColors.muted, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.ink, height: 1.1)),
          if (sub != null) ...[
            const SizedBox(height: 6),
            Text(sub!, style: const TextStyle(fontSize: 14, color: AppColors.muted)),
          ],
        ],
      ),
    );
  }
}
