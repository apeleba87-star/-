import '../constants/magam_copy.dart';
import '../constants/region_registry.g.dart';
import '../constants/work_kind_copy.dart';

class ListingDraft {
  const ListingDraft({
    required this.listingType,
    required this.cityId,
    required this.districtSlug,
    required this.workKind,
    this.scheduleDate,
    this.timeSlot,
    this.pyeong,
    this.acTypes = const [],
    this.otherDetail,
    this.specialNotes,
    this.priceAmount,
    this.priceUnit = 'man',
  });

  final String listingType;
  final String cityId;
  final String districtSlug;
  final String workKind;
  final DateTime? scheduleDate;
  final String? timeSlot;
  final int? pyeong;
  final List<String> acTypes;
  final String? otherDetail;
  final String? specialNotes;
  final int? priceAmount;
  final String priceUnit;

  String get regionLabel {
    return magamRegionDisplayLabel(cityId, districtSlug);
  }

  String? get scheduleLabel {
    final parts = <String>[];
    if (scheduleDate != null) {
      final d = scheduleDate!;
      const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
      parts.add('${d.year}년 ${d.month}월 ${d.day}일 (${weekdays[d.weekday - 1]})');
    }
    if (timeSlot != null) {
      parts.add(timeSlotLabels[timeSlot] ?? timeSlot!);
    }
    if (parts.isEmpty) return null;
    return parts.join(' · ');
  }

  String? get priceLabel {
    if (priceAmount == null || priceAmount! <= 0) return null;
    if (priceUnit == 'jan') {
      return '잔 ${priceAmount! ~/ 10000}';
    }
    final man = priceAmount! ~/ 10000;
    return '$man만원';
  }

  String buildBodyText() {
    final type = listingTypeLabels[listingType] ?? listingType;
    final work = workKindLabels[workKind] ?? workKind;
    final parts = <String>[type, work];

    if (workKind == 'move_in_new' || workKind == 'move_out') {
      if (pyeong != null) parts.add('$pyeong평');
    }
    if (workKind == 'ac' && acTypes.isNotEmpty) {
      parts.add(acTypes.map((t) => acTypeLabels[t] ?? t).join(', '));
    }
    if (workKind == 'other' &&
        otherDetail != null &&
        otherDetail!.trim().isNotEmpty) {
      parts.add(otherDetail!.trim());
    }

    var text = parts.join(' · ');
    if (text.length < 4) text = '$text · $regionLabel';
    return text;
  }

  String buildPreviewLine() {
    final chunks = <String>[
      if (scheduleLabel != null) scheduleLabel!,
      regionLabel,
      workKindLabels[workKind] ?? workKind,
      if (pyeong != null) '$pyeong평',
      if (priceLabel != null) priceLabel!,
      if (specialNotes != null && specialNotes!.trim().isNotEmpty) '특이사항 있음',
    ];
    return chunks.join(' · ');
  }
}
