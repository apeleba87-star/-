import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../constants/magam_copy.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('내 공고')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: MagamScreenPadding.listWithBottomNav(context),
                children: [
                  Text(
                    magamAppTagline,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: MagamColors.inkMuted,
                        ),
                    textAlign: TextAlign.center,
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
                            '아래 글쓰기 탭에서 첫 공고를 올려 보세요.',
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
