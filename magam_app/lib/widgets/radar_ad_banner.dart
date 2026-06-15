import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../models/radar_ad.dart';
import '../services/radar_ad_service.dart';
import '../theme/magam_theme.dart';

class RadarAdNationalBanner extends StatefulWidget {
  const RadarAdNationalBanner({
    super.key,
    required this.pagePath,
    this.service,
    this.compact = false,
  });

  final String pagePath;
  final RadarAdService? service;
  final bool compact;

  @override
  State<RadarAdNationalBanner> createState() => _RadarAdNationalBannerState();
}

class _RadarAdNationalBannerState extends State<RadarAdNationalBanner> {
  late final RadarAdService _service = widget.service ?? RadarAdService();
  RadarAdBanner? _banner;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final banner = await _service.fetchNationalBanner();
    if (!mounted) return;
    setState(() {
      _banner = banner;
      _loaded = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _banner == null) return const SizedBox.shrink();
    return RadarAdCarousel(
      banner: _banner!,
      pagePath: widget.pagePath,
      service: _service,
      compact: widget.compact,
    );
  }
}

class RadarAdRegionalBanner extends StatefulWidget {
  const RadarAdRegionalBanner({
    super.key,
    required this.regionKeys,
    required this.pagePath,
    this.service,
    this.compact = false,
  });

  final List<String> regionKeys;
  final String pagePath;
  final RadarAdService? service;
  final bool compact;

  @override
  State<RadarAdRegionalBanner> createState() => _RadarAdRegionalBannerState();
}

class _RadarAdRegionalBannerState extends State<RadarAdRegionalBanner> {
  late final RadarAdService _service = widget.service ?? RadarAdService();
  RadarAdBanner? _banner;
  bool _loaded = false;
  String _keysKey = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant RadarAdRegionalBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextKey = widget.regionKeys.join('|');
    if (nextKey != _keysKey) _load();
  }

  Future<void> _load() async {
    final keysKey = widget.regionKeys.join('|');
    if (widget.regionKeys.isEmpty) {
      setState(() {
        _banner = null;
        _loaded = true;
        _keysKey = keysKey;
      });
      return;
    }

    setState(() => _loaded = false);
    final banner = await _service.fetchFirstRegionalBanner(widget.regionKeys);
    if (!mounted) return;
    setState(() {
      _banner = banner;
      _loaded = true;
      _keysKey = keysKey;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _banner == null) return const SizedBox.shrink();
    return RadarAdCarousel(
      banner: _banner!,
      pagePath: widget.pagePath,
      service: _service,
      compact: widget.compact,
    );
  }
}

class RadarAdCarousel extends StatefulWidget {
  const RadarAdCarousel({
    super.key,
    required this.banner,
    required this.pagePath,
    required this.service,
    this.compact = false,
  });

  final RadarAdBanner banner;
  final String pagePath;
  final RadarAdService service;
  final bool compact;

  @override
  State<RadarAdCarousel> createState() => _RadarAdCarouselState();
}

class _RadarAdCarouselState extends State<RadarAdCarousel> {
  late int _activeIndex;
  Timer? _timer;
  final Set<String> _impressed = {};

  @override
  void initState() {
    super.initState();
    _activeIndex = 0;
    _scheduleRotation();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_trackImpression());
    });
  }

  @override
  void didUpdateWidget(covariant RadarAdCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.banner.slots != widget.banner.slots) {
      _activeIndex = 0;
      _timer?.cancel();
      _scheduleRotation();
      unawaited(_trackImpression());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _scheduleRotation() {
    final count = widget.banner.slots.length;
    if (count <= 1) return;
    final seconds = widget.banner.rotationSeconds.clamp(5, 60);
    _timer = Timer.periodic(Duration(seconds: seconds), (_) async {
      if (!mounted) return;
      setState(() => _activeIndex = (_activeIndex + 1) % count);
      await _trackImpression();
    });
  }

  Future<void> _trackImpression() async {
    final slot = widget.banner.slots[_activeIndex];
    if (_impressed.contains(slot.id)) return;
    final ok = await widget.service.trackEvent(
      eventType: 'impression',
      slotId: slot.id,
      pagePath: widget.pagePath,
    );
    if (ok && mounted) {
      _impressed.add(slot.id);
    }
  }

  Future<void> _onTap(RadarAdSlot slot) async {
    await widget.service.trackEvent(
      eventType: 'click',
      slotId: slot.id,
      pagePath: widget.pagePath,
    );

    final raw = slot.ctaUrl.trim();
    if (raw.isEmpty || raw == '#') return;

    final uri = _resolveUri(raw);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Uri? _resolveUri(String raw) {
    if (raw.startsWith('tel:') || raw.startsWith('mailto:')) {
      return Uri.tryParse(raw);
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return Uri.tryParse(raw);
    }
    if (raw.startsWith('/')) {
      return Uri.tryParse('${AppConfig.shareBaseUrl}$raw');
    }
    return Uri.tryParse('https://$raw');
  }

  @override
  Widget build(BuildContext context) {
    final slot = widget.banner.slots[_activeIndex];
    final count = widget.banner.slots.length;
    final compact = widget.compact;

    return Padding(
      padding: EdgeInsets.symmetric(vertical: compact ? 4 : 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Material(
            color: MagamColors.surface,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(compact ? MagamColors.radiusMd : MagamColors.radiusLg),
              side: const BorderSide(color: MagamColors.border),
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => _onTap(slot),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(compact ? 10 : 12, compact ? 6 : 10, compact ? 10 : 12, 0),
                    child: Row(
                      children: [
                        Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: compact ? 6 : 8,
                            vertical: compact ? 2 : 3,
                          ),
                          decoration: BoxDecoration(
                            color: MagamColors.accentSoft,
                            borderRadius: BorderRadius.circular(MagamColors.radiusSm),
                          ),
                          child: Text(
                            widget.banner.badgeLabel,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: MagamColors.accent,
                                  fontWeight: FontWeight.w600,
                                  fontSize: compact ? 10 : null,
                                ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '광고',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: MagamColors.inkFaint,
                                fontSize: compact ? 10 : null,
                              ),
                        ),
                      ],
                    ),
                  ),
                  if (slot.imageUrl != null && slot.imageUrl!.isNotEmpty)
                    AspectRatio(
                      aspectRatio: compact ? 5.2 : 3,
                      child: Image.network(
                        slot.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _textBody(slot, compact: compact),
                      ),
                    )
                  else
                    _textBody(slot, compact: compact),
                ],
              ),
            ),
          ),
          if (count > 1)
            Padding(
              padding: EdgeInsets.only(top: compact ? 4 : 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(count, (i) {
                  final active = i == _activeIndex;
                  return GestureDetector(
                    onTap: () {
                      setState(() => _activeIndex = i);
                      unawaited(_trackImpression());
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: active ? (compact ? 12 : 16) : 6,
                      height: compact ? 5 : 6,
                      decoration: BoxDecoration(
                        color: active ? MagamColors.ink : MagamColors.border,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  );
                }),
              ),
            ),
        ],
      ),
    );
  }

  Widget _textBody(RadarAdSlot slot, {bool compact = false}) {
    return Padding(
      padding: EdgeInsets.all(compact ? 10 : 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (slot.advertiserName != null && slot.advertiserName!.isNotEmpty)
            Text(
              slot.advertiserName!,
              style: Theme.of(context).textTheme.labelMedium,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          SizedBox(height: compact ? 2 : 4),
          Text(
            slot.title,
            style: compact
                ? Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)
                : Theme.of(context).textTheme.titleSmall,
            maxLines: compact ? 1 : 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (!compact && slot.description != null && slot.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              slot.description!,
              style: Theme.of(context).textTheme.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          SizedBox(height: compact ? 6 : 10),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 8 : 12,
              vertical: compact ? 5 : 8,
            ),
            decoration: BoxDecoration(
              color: MagamColors.ink,
              borderRadius: BorderRadius.circular(MagamColors.radiusSm),
            ),
            child: Text(
              slot.ctaText,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.white,
                    fontSize: compact ? 11 : null,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
