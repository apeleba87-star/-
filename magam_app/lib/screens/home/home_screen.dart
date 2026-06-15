import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/magam_listing.dart';
import '../../services/magam_repository.dart';
import '../../theme/magam_theme.dart';
import '../../widgets/my_listing_card.dart';
import '../../widgets/magam_screen_padding.dart';
import '../../widgets/magam_section_card.dart';
import '../../widgets/radar_ad_banner.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final MagamRepository _repo;
  List<MagamListing> _listings = [];
  bool _loading = true;
  String? _error;

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
      final rows = await _repo.fetchMyListings();
      if (!mounted) return;
      setState(() {
        _listings = rows;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _signOut() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('로그아웃'),
        content: const Text('로그아웃 하시겠습니까?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('로그아웃')),
        ],
      ),
    );
    if (ok != true) return;
    await Supabase.instance.client.auth.signOut();
  }

  String _accountLabel() {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return '';
    return user.email ??
        user.userMetadata?['display_name']?.toString() ??
        user.userMetadata?['name']?.toString() ??
        '로그인됨';
  }

  @override
  Widget build(BuildContext context) {
    final accountLabel = _accountLabel();

    return Scaffold(
      appBar: AppBar(
        title: const Text('내 공고'),
        actions: [
          TextButton(
            onPressed: _signOut,
            child: const Text('로그아웃'),
          ),
        ],
      ),
      floatingActionButton: Padding(
        padding: MagamScreenPadding.fab(context),
        child: FloatingActionButton.extended(
          onPressed: () async {
            await context.push('/compose');
            if (mounted) _load();
          },
          icon: const Icon(Icons.edit_outlined),
          label: const Text('글쓰기'),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: MagamScreenPadding.listWithFab(context),
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: MagamColors.surface,
                      borderRadius: BorderRadius.circular(MagamColors.radiusMd),
                      border: Border.all(color: MagamColors.border),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: MagamColors.accentSoft,
                          child: const Icon(Icons.person_outline, size: 20, color: MagamColors.accent),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            accountLabel,
                            style: Theme.of(context).textTheme.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const RadarAdNationalBanner(pagePath: 'magam:home'),
                  if (_error != null) MagamErrorBanner(message: _error!),
                  if (!_loading && _listings.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 56),
                      child: Column(
                        children: [
                          Icon(Icons.inbox_outlined, size: 48, color: MagamColors.inkFaint),
                          const SizedBox(height: 16),
                          Text(
                            '아직 등록한 공고가 없습니다',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '글쓰기로 첫 공고를 올려 보세요.',
                            style: Theme.of(context).textTheme.bodySmall,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ..._listings.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: MyListingCard(
                        listing: item,
                        onTap: () async {
                          await context.push('/listing/${item.id}');
                          if (mounted) _load();
                        },
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
