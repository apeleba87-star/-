import 'package:flutter/material.dart';

import '../../theme/magam_theme.dart';

/// 일정 날짜 — 오늘/내일/달력 선택
class ScheduleDateField extends StatelessWidget {
  const ScheduleDateField({
    super.key,
    required this.selectedDate,
    required this.onDateChanged,
    this.enabled = true,
    this.compact = false,
  });

  final DateTime? selectedDate;
  final ValueChanged<DateTime?> onDateChanged;
  final bool enabled;
  final bool compact;

  static DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  static DateTime get today {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  static String formatLabel(DateTime date) {
    const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    final w = weekdays[date.weekday - 1];
    return '${date.year}년 ${date.month}월 ${date.day}일 ($w)';
  }

  bool _sameDay(DateTime? a, DateTime b) {
    if (a == null) return false;
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Future<void> _openPicker(BuildContext context) async {
    if (!enabled) return;
    final picked = await showDatePicker(
      context: context,
      locale: const Locale('ko', 'KR'),
      initialDate: selectedDate ?? today,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      helpText: '일정 날짜 선택',
      cancelText: '취소',
      confirmText: '확인',
    );
    if (picked != null) onDateChanged(dateOnly(picked));
  }

  @override
  Widget build(BuildContext context) {
    final tomorrow = today.add(const Duration(days: 1));
    final isToday = _sameDay(selectedDate, today);
    final isTomorrow = _sameDay(selectedDate, tomorrow);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!compact) ...[
          Text('일정 (선택)', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 10),
        ],
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ChoiceChip(
              label: const Text('오늘'),
              selected: isToday,
              onSelected: enabled
                  ? (on) => onDateChanged(on ? today : null)
                  : null,
            ),
            ChoiceChip(
              label: const Text('내일'),
              selected: isTomorrow,
              onSelected: enabled
                  ? (on) => onDateChanged(on ? tomorrow : null)
                  : null,
            ),
            ActionChip(
              label: const Text('날짜 선택'),
              avatar: Icon(Icons.calendar_today_outlined, size: 18, color: MagamColors.inkMuted),
              onPressed: enabled ? () => _openPicker(context) : null,
            ),
          ],
        ),
        if (selectedDate != null) ...[
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: MagamColors.accentSoft,
              borderRadius: BorderRadius.circular(MagamColors.radiusMd),
              border: Border.all(color: const Color(0xFFD6E4FF)),
            ),
            child: ListTile(
              dense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              leading: const Icon(Icons.event_outlined, color: MagamColors.accent),
              title: Text(
                formatLabel(selectedDate!),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              trailing: IconButton(
                tooltip: '일정 지우기',
                icon: const Icon(Icons.close_rounded, size: 20),
                onPressed: enabled ? () => onDateChanged(null) : null,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
