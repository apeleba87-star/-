import 'package:flutter/material.dart';

import '../models/magam_listing.dart';import '../theme/magam_theme.dart';
import '../utils/kr_phone_format.dart';
import '../utils/magam_share_format.dart';
import 'magam_section_card.dart';

/// 공유 문구와 동일한 레이아웃으로 공고 내용 표시
class MagamListingShareView extends StatelessWidget {
  const MagamListingShareView({
    super.key,
    required this.listing,
    this.typeLabel,
    this.statusLabel,
  });

  final MagamListing listing;
  final String? typeLabel;
  final String? statusLabel;

  static const _blockGap = 16.0;
  static const _sectionGap = 24.0;

  @override
  Widget build(BuildContext context) {
    final rows = MagamShareFormat.listingDisplayRows(listing);

    return MagamSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (statusLabel != null || typeLabel != null)
            Row(
              children: [
                if (statusLabel != null)
                  MagamStatusBadge(
                    label: statusLabel!,
                    isOpen: listing.isOpen,
                  ),
                const Spacer(),
                if (typeLabel != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: MagamColors.ink,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      typeLabel!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          if (statusLabel != null || typeLabel != null)
            const SizedBox(height: _sectionGap),
          ...rows.map(
            (row) => Padding(
              padding: const EdgeInsets.only(bottom: _blockGap),
              child: _ShareDisplayRow(row: row),
            ),
          ),
          if (listing.isOpen) ...[
            const SizedBox(height: _blockGap),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: MagamColors.canvas,
                borderRadius: BorderRadius.circular(MagamColors.radiusMd),
              ),
              child: _ShareDisplayRow(
                row: MagamDisplayRow(
                  '연락처',
                  KrPhoneFormat.display(listing.contactPhone),
                ),
                emphasizeValue: true,
              ),
            ),
          ] else ...[
            const SizedBox(height: _blockGap),
            Text(
              '마감됨 — 연락처 숨김',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MagamColors.inkMuted,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ShareDisplayRow extends StatelessWidget {
  const _ShareDisplayRow({
    required this.row,
    this.emphasizeValue = false,
  });

  final MagamDisplayRow row;
  final bool emphasizeValue;

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
          color: MagamColors.inkMuted,
          fontWeight: FontWeight.w600,
          height: 1.45,
        );
    final valueStyle = emphasizeValue
        ? Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              height: 1.35,
            )
        : Theme.of(context).textTheme.bodyLarge?.copyWith(
              height: 1.45,
            );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${row.label}:',
          style: labelStyle,
          softWrap: false,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(row.value, style: valueStyle),
        ),
      ],
    );
  }
}
