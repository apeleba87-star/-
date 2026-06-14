import 'package:flutter/material.dart';

import '../../constants/region_registry.g.dart';
import '../../services/recent_regions_store.dart';
import '../../theme/magam_theme.dart';
import '../magam_section_card.dart';

class RegionPickerSection extends StatelessWidget {
  const RegionPickerSection({
    super.key,
    required this.cities,
    required this.cityId,
    required this.districtSlug,
    this.recentRegions = const [],
    required this.onCityChanged,
    required this.onDistrictChanged,
    required this.onRecentSelected,
    this.enabled = true,
  });

  final List<MagamRegionCity> cities;
  final String cityId;
  final String districtSlug;
  final List<RecentRegion> recentRegions;
  final ValueChanged<String> onCityChanged;
  final ValueChanged<String> onDistrictChanged;
  final ValueChanged<RecentRegion> onRecentSelected;
  final bool enabled;

  MagamRegionCity get _selectedCity =>
      magamCityById(cityId) ?? kMagamDefaultCity;

  @override
  Widget build(BuildContext context) {
    final districts = _selectedCity.districts;
    final regionLabel = magamRegionDisplayLabel(cityId, districtSlug);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (recentRegions.isNotEmpty) ...[
          const MagamSubLabel('최근 지역'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final recent in recentRegions)
                ActionChip(
                  label: Text(
                    magamRegionDisplayLabel(
                      recent.cityId,
                      recent.districtSlug,
                    ),
                  ),
                  onPressed: enabled
                      ? () => onRecentSelected(recent)
                      : null,
                ),
            ],
          ),
          const SizedBox(height: 16),
        ],
        DropdownButtonFormField<String>(
          key: ValueKey('city-$cityId'),
          initialValue: cityId,
          decoration: const InputDecoration(
            labelText: '시·도',
            border: OutlineInputBorder(),
          ),
          items: cities
              .map((c) => DropdownMenuItem(value: c.id, child: Text(c.label)))
              .toList(),
          onChanged: enabled ? (v) => v != null ? onCityChanged(v) : null : null,
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          key: ValueKey('district-$cityId-$districtSlug'),
          initialValue: districts.any((d) => d.slug == districtSlug)
              ? districtSlug
              : districts.first.slug,
          decoration: const InputDecoration(
            labelText: '시·군·구',
            border: OutlineInputBorder(),
          ),
          items: districts
              .map((d) => DropdownMenuItem(value: d.slug, child: Text(d.gu)))
              .toList(),
          onChanged: enabled
              ? (v) => v != null ? onDistrictChanged(v) : null
              : null,
        ),
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: MagamColors.accentSoft,
              borderRadius: BorderRadius.circular(MagamColors.radiusSm),
            ),
            child: Text(
              regionLabel,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: MagamColors.accent,
                  ),
            ),
          ),
        ),
      ],
    );
  }
}
