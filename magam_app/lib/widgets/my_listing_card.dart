import 'package:flutter/material.dart';

import '../constants/magam_copy.dart';
import '../models/magam_listing.dart';
import '../theme/magam_theme.dart';
import '../utils/magam_share_format.dart';
import 'magam_section_card.dart';

class MyListingCard extends StatelessWidget {
  const MyListingCard({
    super.key,
    required this.listing,
    required this.onTap,
  });

  final MagamListing listing;
  final VoidCallback onTap;

  static String _shortDate(DateTime d) => '${d.month}.${d.day}';

  static String? _scheduleHeadline(MagamListing listing) {
    return MagamShareFormat.scheduleWithTime(listing);
  }

  static String _metaDate(MagamListing listing) {
    if (!listing.isOpen && listing.closedAt != null) {
      return '마감 ${_shortDate(listing.closedAt!)}';
    }
    return '등록 ${_shortDate(listing.createdAt)}';
  }

  @override
  Widget build(BuildContext context) {
    final isClosed = !listing.isOpen;
    final statusLabel = statusLabels[listing.status] ?? listing.status;
    final scheduleHeadline = _scheduleHeadline(listing);
    final rows = MagamShareFormat.listingDisplayRows(listing)
        .where((row) => scheduleHeadline == null || row.label != '일정')
        .toList();
    final labelColor = isClosed ? MagamColors.inkFaint : MagamColors.inkMuted;
    final valueColor = isClosed ? MagamColors.inkMuted : MagamColors.ink;

    return Material(
      color: isClosed ? MagamColors.closedSurface : MagamColors.surface,
      borderRadius: BorderRadius.circular(MagamColors.radiusLg),
      child: InkWell(
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(MagamColors.radiusLg),
            border: Border.all(
              color: isClosed ? MagamColors.closedBorder : MagamColors.border,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    MagamListingTypeBadge(
                      listingType: listing.listingType,
                      muted: isClosed,
                    ),
                    const Spacer(),
                    MagamStatusBadge(
                      label: statusLabel,
                      isOpen: listing.isOpen,
                    ),
                  ],
                ),
                if (scheduleHeadline != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    scheduleHeadline,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: isClosed ? MagamColors.inkMuted : MagamColors.ink,
                        ),
                  ),
                ],
                if (rows.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  ...rows.map(
                    (row) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: RichText(
                        text: TextSpan(
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: labelColor,
                                height: 1.45,
                              ),
                          children: [
                            TextSpan(
                              text: '${row.label}: ',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            TextSpan(
                              text: row.value,
                              style: TextStyle(color: valueColor),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 10),
                  Text(
                    listing.bodyText.replaceAll('\n', ' '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: valueColor,
                          height: 1.45,
                        ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  _metaDate(listing),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: MagamColors.inkFaint,
                        fontSize: 11,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
