import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../constants/magam_copy.dart';
import '../../constants/work_kind_copy.dart';
import '../../models/magam_listing.dart';
import '../../services/magam_kakao_share.dart';
import '../../services/magam_repository.dart';
import '../../theme/magam_theme.dart';
import '../../widgets/kakao_share_button.dart';
import '../../widgets/magam_section_card.dart';



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

        content: const Text('마감하면 모든 화면에서 연락처가 숨겨집니다.'),

        actions: [

          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),

          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('마감')),

        ],

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
      final text = MagamKakaoShare.buildShareText(listing: listing, url: url);
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



  String? _workDetailLine(MagamListing listing) {

    if (listing.workKind == null) return null;

    final work = workKindLabels[listing.workKind] ?? listing.workKind!;

    final parts = <String>[work];

    if (listing.pyeong != null) parts.add('${listing.pyeong}평');

    if (listing.acTypes.isNotEmpty) {

      parts.add(

        listing.acTypes.map((t) => acTypeLabels[t] ?? t).join(', '),

      );

    }

    return parts.join(' · ');

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

    final workLine = _workDetailLine(listing);



    return Scaffold(
      appBar: AppBar(
        title: Text('$typeLabel · ${listing.regionGu}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _goHome,
        ),
      ),

      body: ListView(

        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),

        children: [

          if (widget.highlightShare) ...[
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: MagamColors.successSoft,
                borderRadius: BorderRadius.circular(MagamColors.radiusLg),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.check_circle_outline, color: MagamColors.success),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '등록 완료!',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '링크 복사 또는 카톡 단톡방 공유로 마무리하세요.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _copyLink,
                    icon: const Icon(Icons.link_rounded),
                    label: const Text('공유 링크 복사'),
                    style: FilledButton.styleFrom(
                      backgroundColor: MagamColors.success,
                    ),
                  ),
                  const SizedBox(height: 10),
                  KakaoShareButton(
                    onPressed: _shareToKakao,
                    loading: _kakaoSharing,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _goHome,
                    child: const Text('내 공고로 가기'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          MagamSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    MagamStatusBadge(label: statusLabel, isOpen: listing.isOpen),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: MagamColors.ink,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        typeLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(listing.bodyText, style: Theme.of(context).textTheme.bodyLarge),
                if (workLine != null) ...[
                  const SizedBox(height: 8),
                  Text(workLine, style: Theme.of(context).textTheme.bodySmall),
                ],
                if (listing.scheduleText != null) ...[
                  const SizedBox(height: 14),
                  _DetailRow(label: '일정', value: listing.scheduleText!),
                ],
                if (listing.priceText != null) ...[
                  const SizedBox(height: 8),
                  _DetailRow(label: '금액', value: listing.priceText!),
                ],
                if (listing.specialNotes != null &&
                    listing.specialNotes!.trim().isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text('특이사항', style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(
                    listing.specialNotes!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: MagamColors.canvas,
                    borderRadius: BorderRadius.circular(MagamColors.radiusMd),
                  ),
                  child: Text(
                    listing.isOpen
                        ? '연락처  ${listing.contactPhone}'
                        : '마감됨 — 연락처 숨김',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: listing.isOpen ? MagamColors.ink : MagamColors.inkMuted,
                        ),
                  ),
                ),
              ],
            ),
          ),

          if (!widget.highlightShare) ...[
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _copyLink,
              icon: const Icon(Icons.link_rounded),
              label: const Text('링크 복사'),
            ),
            const SizedBox(height: 10),
            KakaoShareButton(
              onPressed: _shareToKakao,
              loading: _kakaoSharing,
            ),
          ],
          if (listing.isOpen) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _closing ? null : _closeListing,
              style: OutlinedButton.styleFrom(foregroundColor: MagamColors.danger),
              child: Text(_closing ? '마감 중…' : '모집 마감하기'),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '모집이 끝나면 눌러 주세요. 연락처가 모든 화면에서 숨겨집니다.',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 44,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        Expanded(
          child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ),
      ],
    );
  }
}


