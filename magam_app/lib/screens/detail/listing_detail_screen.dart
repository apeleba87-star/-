import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../constants/magam_copy.dart';
import '../../models/magam_listing.dart';
import '../../services/magam_kakao_share.dart';
import '../../services/magam_repository.dart';
import '../../services/magam_share_prefs.dart';
import '../../theme/magam_theme.dart';
import '../../utils/magam_share_format.dart';
import '../../widgets/kakao_share_button.dart';
import '../../widgets/kakao_share_phone_option.dart';
import '../../widgets/magam_listing_share_view.dart';
import '../../widgets/magam_screen_padding.dart';
import '../../widgets/naver_cafe_copy_button.dart';
import '../../widgets/radar_ad_banner.dart';
import '../../utils/magam_region_key.dart';



class ListingDetailScreen extends StatefulWidget {

  const ListingDetailScreen({

    super.key,

    required this.listingId,

    this.highlightShare = false,

  });



  final String listingId;

  final bool highlightShare;



  @override

  State<ListingDetailScreen> createState() => _ListingDetailScreenState();

}



class _ListingDetailScreenState extends State<ListingDetailScreen> {

  late final MagamRepository _repo;

  MagamListing? _listing;

  bool _loading = true;

  bool _closing = false;

  bool _copiedOnEntry = false;
  bool _kakaoSharing = false;
  bool _includePhoneInKakaoShare = false;
  String? _error;



  static const _select =

      'id, user_id, listing_type, region_gu, body_text, contact_phone, '

      'price_text, schedule_text, schedule_date, time_slot, work_kind, '

      'pyeong, ac_types, price_amount, price_unit, special_notes, status, share_slug, '

      'linked_service_disclosed, created_at, closed_at';



  @override

  void initState() {

    super.initState();

    _repo = MagamRepository(Supabase.instance.client);

    _load();

    _loadSharePrefs();

  }



  Future<void> _loadSharePrefs() async {

    final includePhone = await MagamSharePrefs.loadIncludePhoneInKakao();

    if (mounted) setState(() => _includePhoneInKakaoShare = includePhone);

  }



  Future<void> _setIncludePhoneInKakao(bool value) async {

    setState(() => _includePhoneInKakaoShare = value);

    await MagamSharePrefs.saveIncludePhoneInKakao(value);

  }



  Future<void> _load() async {

    setState(() {

      _loading = true;

      _error = null;

    });

    try {

      final row = await Supabase.instance.client

          .from('magam_listings')

          .select(_select)

          .eq('id', widget.listingId)

          .maybeSingle();



      if (!mounted) return;

      if (row == null) {

        setState(() {

          _error = '글을 찾을 수 없습니다.';

          _loading = false;

        });

        return;

      }

      final listing = MagamListing.fromJson(Map<String, dynamic>.from(row));

      setState(() {

        _listing = listing;

        _loading = false;

      });

      if (widget.highlightShare && !_copiedOnEntry) {

        _copiedOnEntry = true;

        await _copyLink(silent: true);

      }

    } catch (e) {

      if (!mounted) return;

      setState(() {

        _error = e.toString();

        _loading = false;

      });

    }

  }



  void _goHome() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  Future<void> _closeListing() async {

    final listing = _listing;

    if (listing == null || !listing.isOpen) return;



    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('마감할까요?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('마감하면 모든 화면에서 연락처가 숨겨집니다.'),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('취소'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('마감'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    if (ok != true) return;



    setState(() => _closing = true);

    try {

      final updated = await _repo.closeListing(listing.id);

      if (!mounted) return;

      setState(() {

        _listing = updated;

        _closing = false;

      });

      ScaffoldMessenger.of(context).showSnackBar(

        const SnackBar(content: Text('마감되었습니다.')),

      );

    } catch (e) {

      if (!mounted) return;

      setState(() => _closing = false);

      ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(content: Text(e.toString())),

      );

    }

  }



  Future<void> _copyLink({bool silent = false}) async {

    final listing = _listing;

    if (listing == null) return;

    final url = _repo.buildShareUrl(listing);

    await Clipboard.setData(ClipboardData(text: url));

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(

      SnackBar(

        content: Text(

          silent

              ? '링크가 복사됐어요. 카톡에 붙여넣으세요.'

              : '링크 복사: $url',

        ),

        duration: const Duration(seconds: 4),

      ),

    );

  }



  Future<void> _shareToKakao() async {
    final listing = _listing;
    if (listing == null || _kakaoSharing) return;

    setState(() => _kakaoSharing = true);
    try {
      final url = _repo.buildShareUrl(listing);
      final text = MagamKakaoShare.buildShareText(
        listing: listing,
        url: url,
        includePhone: _includePhoneInKakaoShare,
      );
      final outcome = await MagamKakaoShare.shareToKakaoTalk(text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(MagamKakaoShare.snackbarMessage(outcome)),
          duration: const Duration(seconds: 4),
        ),
      );
    } finally {
      if (mounted) setState(() => _kakaoSharing = false);
    }
  }



  Future<void> _copyForNaverCafe() async {
    final listing = _listing;
    if (listing == null) return;

    final url = _repo.buildShareUrl(listing);
    final text = MagamShareFormat.buildNaverCafeMessage(
      listing: listing,
      url: url,
      includePhone: _includePhoneInKakaoShare,
    );
    await Clipboard.setData(ClipboardData(text: text));

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(magamNaverCafeCopyDone),
        duration: Duration(seconds: 4),
      ),
    );
  }

  Widget _shareBlock(MagamListing listing) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (listing.isOpen) ...[
          KakaoSharePhoneOption(
            value: _includePhoneInKakaoShare,
            onChanged: _kakaoSharing ? null : _setIncludePhoneInKakao,
            enabled: !_kakaoSharing,
          ),
          const SizedBox(height: 10),
        ],
        KakaoShareButton(
          onPressed: _shareToKakao,
          loading: _kakaoSharing,
        ),
        const SizedBox(height: 10),
        NaverCafeCopyButton(onPressed: _copyForNaverCafe),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _copyLink,
          icon: const Icon(Icons.link_rounded, size: 20),
          label: Text(widget.highlightShare ? '공유 링크 복사' : '링크 복사'),
        ),
      ],
    );
  }

  Widget _registrationBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MagamColors.successSoft,
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline, color: MagamColors.success),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '등록 완료!',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  '내용 확인 후 카톡·카페에 붙여넣으세요.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }



  @override
  Widget build(BuildContext context) {

    if (_loading) {

      return Scaffold(

        appBar: AppBar(),

        body: const Center(child: CircularProgressIndicator()),

      );

    }



    final listing = _listing;

    if (listing == null) {

      return Scaffold(

        appBar: AppBar(),

        body: Center(child: Text(_error ?? '오류')),

      );

    }



    final typeLabel = listingTypeLabels[listing.listingType] ?? listing.listingType;

    final statusLabel = statusLabels[listing.status] ?? listing.status;

    final regionalKeys = listing.cityId != null &&
            listing.districtSlug != null &&
            listing.cityId!.isNotEmpty &&
            listing.districtSlug!.isNotEmpty
        ? magamRegionalAdCandidateKeys(listing.cityId!, listing.districtSlug!)
        : <String>[];

    return Scaffold(
      appBar: AppBar(
        title: const Text('모집 안내'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _goHome,
        ),
      ),

      body: ListView(
        padding: MagamScreenPadding.list(context, extraBottom: 32),
        children: [
          if (widget.highlightShare) ...[
            _registrationBanner(context),
            const SizedBox(height: 12),
          ],
          MagamListingShareView(
            listing: listing,
            typeLabel: typeLabel,
            statusLabel: statusLabel,
          ),
          if (regionalKeys.isNotEmpty)
            RadarAdRegionalBanner(
              regionKeys: regionalKeys,
              pagePath: 'magam:listing/${listing.id}',
            ),
          const SizedBox(height: 16),
          _shareBlock(listing),
          RadarAdNationalBanner(pagePath: 'magam:listing/${listing.id}'),
          if (widget.highlightShare) ...[
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: _goHome,
                child: const Text('내 공고로 가기'),
              ),
            ),
          ],
          if (listing.isOpen) ...[
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: _closing ? null : _closeListing,
              style: OutlinedButton.styleFrom(foregroundColor: MagamColors.danger),
              child: Text(_closing ? '마감 중…' : '모집 마감하기'),
            ),
          ],
        ],
      ),
    );
  }
}
