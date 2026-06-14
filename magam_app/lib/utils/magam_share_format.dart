import '../constants/magam_copy.dart';
import '../constants/work_kind_copy.dart';
import '../config/app_config.dart';
import '../models/magam_listing.dart';
import '../utils/kr_phone_format.dart';

/// 공유·상세 화면 공통 표시 행
class MagamDisplayRow {
  const MagamDisplayRow(this.label, this.value);

  final String label;
  final String value;
}

/// 카카오·링크 공유용 문구 (필드별 한 줄씩)
class MagamShareFormat {
  static String? formatTimeSlot(String? slot) {
    if (slot == null || slot.isEmpty) return null;
    return timeSlotLabels[slot] ?? slot;
  }

  static String? workSummaryLine(MagamListing listing) {
    final parts = <String>[];
    final type = listingTypeLabels[listing.listingType] ?? listing.listingType;
    parts.add(type);

    if (listing.workKind != null && listing.workKind!.isNotEmpty) {
      parts.add(workKindLabels[listing.workKind] ?? listing.workKind!);
    }
    if (listing.pyeong != null) parts.add('${listing.pyeong}평');
    if (listing.acTypes.isNotEmpty) {
      parts.add(
        listing.acTypes.map((t) => acTypeLabels[t] ?? t).join(' / '),
      );
    }

    final price = _priceLabel(listing);
    if (price != null) parts.add(price);

    if (parts.length <= 1) {
      final body = listing.bodyText.trim().replaceAll(' · ', ' / ');
      if (body.isEmpty) return null;
      if (price != null && !body.contains(price)) {
        return '$body / $price';
      }
      return body;
    }
    return parts.join(' / ');
  }

  static String? _priceLabel(MagamListing listing) {
    final text = listing.priceText?.trim();
    if (text != null && text.isNotEmpty) return text;

    final amount = listing.priceAmount;
    if (amount == null || amount <= 0) return null;
    if (listing.priceUnit == 'jan') return '잔 ${amount ~/ 10000}';
    return '${amount ~/ 10000}만원';
  }

  /// 상세 화면·미리보기용 (연락처 포함)
  static List<MagamDisplayRow> listingDisplayRows(MagamListing listing) {
    final rows = <MagamDisplayRow>[];

    final schedule = scheduleWithTime(listing);
    if (schedule != null && schedule.isNotEmpty) {
      rows.add(MagamDisplayRow('일정', schedule));
    }

    final location = listing.regionGu.trim();
    if (location.isNotEmpty) {
      rows.add(MagamDisplayRow('위치', location));
    }

    final work = workSummaryLine(listing);
    if (work != null && work.isNotEmpty) {
      rows.add(MagamDisplayRow(magamShareWorkLabel, work));
    }

    if (listing.specialNotes != null &&
        listing.specialNotes!.trim().isNotEmpty) {
      rows.add(MagamDisplayRow('특이사항', listing.specialNotes!.trim()));
    }

    return rows;
  }

  static String? scheduleWithTime(MagamListing listing) {
    String? datePart;
    if (listing.scheduleDate != null) {
      final d = listing.scheduleDate!;
      datePart = '${d.year}년 ${d.month}월 ${d.day}일';
    }

    final time = _timeForListing(listing);

    if (datePart == null || datePart.isEmpty) {
      final st = listing.scheduleText?.trim();
      if (st != null && st.isNotEmpty) {
        if (st.contains(' · ')) {
          datePart = st.split(' · ').first;
        } else {
          datePart = st;
        }
      }
    }

    if (datePart != null && datePart.isNotEmpty) {
      if (time != null && time.isNotEmpty) return '$datePart / $time';
      return datePart;
    }
    if (time != null && time.isNotEmpty) return time;
    return null;
  }

  static String buildShareMessage({
    required MagamListing listing,
    required String url,
    bool includePhone = false,
  }) {
    final blocks = <String>[];

    final schedule = scheduleWithTime(listing);
    if (schedule != null && schedule.isNotEmpty) {
      blocks.add('일정: $schedule');
    }

    final location = listing.regionGu.trim();
    if (location.isNotEmpty) blocks.add('위치: $location');

    final work = workSummaryLine(listing);
    if (work != null && work.isNotEmpty) {
      blocks.add('$magamShareWorkLabel: $work');
    }

    if (listing.specialNotes != null &&
        listing.specialNotes!.trim().isNotEmpty) {
      blocks.add('특이사항: ${listing.specialNotes!.trim()}');
    }

    var message = blocks.join('\n\n');

    if (includePhone &&
        listing.isOpen &&
        listing.contactPhone.trim().isNotEmpty) {
      final phone =
          '연락처: ${KrPhoneFormat.display(listing.contactPhone)}';
      message = message.isEmpty ? phone : '$message\n\n\n$phone';
    }

    final uri = Uri.tryParse(normalizeShareUrl(url));
    final link = uri != null ? '${uri.host}${uri.path}' : url;
    final footer = [
      magamShareLinkCtaBracket,
      magamShareLinkArrows,
      link,
    ].join('\n');

    return message.isEmpty ? footer : '$message\n\n$footer';
  }

  static List<String> buildLines({
    required MagamListing listing,
    required String url,
    bool includePhone = false,
  }) {
    return buildShareMessage(
      listing: listing,
      url: url,
      includePhone: includePhone,
    ).split('\n');
  }

  static String? _timeForListing(MagamListing listing) {
    final fromSlot = formatTimeSlot(listing.timeSlot);
    if (fromSlot != null) return fromSlot;
    return _timeFromScheduleText(listing.scheduleText);
  }

  static String? _timeFromScheduleText(String? scheduleText) {
    if (scheduleText == null || !scheduleText.contains(' · ')) return null;
    final parts = scheduleText.split(' · ');
    if (parts.length < 2) return null;
    return parts.sublist(1).join(' · ');
  }

  static String normalizeShareUrl(String url) {
    final trimmed = url.trim();
    final uri = Uri.tryParse(trimmed);
    if (uri == null) return trimmed;
    if (uri.host == 'cleanidex.com') {
      return AppConfig.normalizeShareBaseUrl(trimmed);
    }
    return trimmed;
  }
}
