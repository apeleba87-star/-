// 웹 lib/ai-blog/stats.ts 요약의 축소판.

class StatProject {
  const StatProject({
    required this.id,
    required this.serviceType,
    required this.createdAt,
    this.workerCount,
    this.workMinutes,
    this.price,
    this.workDate,
  });

  final String id;
  final String serviceType;
  final DateTime createdAt;
  final int? workerCount;
  final int? workMinutes;
  final int? price;
  final String? workDate;
}

class MonthSummary {
  const MonthSummary({
    required this.count,
    required this.revenue,
    required this.pricedCount,
    required this.missing,
    this.avgPrice,
    this.perManHour,
  });

  final int count;
  final int revenue;
  final int pricedCount;
  final int missing;
  final double? avgPrice;
  final double? perManHour;
}

String kstToday() {
  final now = DateTime.now().toUtc().add(const Duration(hours: 9));
  final m = now.month.toString().padLeft(2, "0");
  final d = now.day.toString().padLeft(2, "0");
  return "${now.year}-$m-$d";
}

String shiftMonth(String month, int delta) {
  final parts = month.split("-");
  final y = int.parse(parts[0]);
  final m = int.parse(parts[1]);
  final d = DateTime.utc(y, m + delta, 1);
  return "${d.year}-${d.month.toString().padLeft(2, "0")}";
}

String monthLabel(String month) {
  final parts = month.split("-");
  return "${parts[0]}년 ${int.parse(parts[1])}월";
}

String workDay(StatProject p) {
  final wd = p.workDate;
  if (wd != null && wd.isNotEmpty) return wd.length >= 10 ? wd.substring(0, 10) : wd;
  final kst = p.createdAt.toUtc().add(const Duration(hours: 9));
  final m = kst.month.toString().padLeft(2, "0");
  final d = kst.day.toString().padLeft(2, "0");
  return "${kst.year}-$m-$d";
}

double? manHoursOf(StatProject p) {
  if (p.workerCount == null || p.workMinutes == null) return null;
  return (p.workerCount! * p.workMinutes!) / 60.0;
}

MonthSummary summarize(List<StatProject> rows) {
  var revenue = 0;
  var pricedCount = 0;
  var missing = 0;
  var effRevenue = 0.0;
  var effHours = 0.0;
  for (final r in rows) {
    final h = manHoursOf(r);
    if (r.price == null || h == null) missing += 1;
    if (r.price == null) continue;
    revenue += r.price!;
    pricedCount += 1;
    if (h != null) {
      effRevenue += r.price!;
      effHours += h;
    }
  }
  return MonthSummary(
    count: rows.length,
    revenue: revenue,
    pricedCount: pricedCount,
    missing: missing,
    avgPrice: pricedCount == 0 ? null : revenue / pricedCount,
    perManHour: effHours == 0 ? null : effRevenue / effHours,
  );
}

String formatWon(num v) {
  final n = v.round().toString();
  return "${n.replaceAllMapped(RegExp(r"\B(?=(\d{3})+(?!\d))"), (_) => ",")}원";
}

String formatManwon(num v) {
  if (v.abs() < 10000) return formatWon(v);
  final m = (v / 1000).round() / 10;
  final s = m == m.roundToDouble() ? m.toInt().toString() : m.toStringAsFixed(1);
  return "$s만원";
}
