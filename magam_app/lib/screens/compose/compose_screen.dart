import 'package:flutter/material.dart';

import 'package:go_router/go_router.dart';

import 'package:supabase_flutter/supabase_flutter.dart';



import '../../services/magam_consent_service.dart';

import '../../services/magam_profile_service.dart';

import '../../services/magam_repository.dart';

import '../../services/recent_regions_store.dart';

import '../../utils/listing_summary.dart';
import '../../utils/kr_phone_format.dart';

import '../../widgets/compose/compose_section.dart';
import '../../widgets/magam_section_card.dart';

import '../../widgets/compose/price_field.dart';

import '../../widgets/compose/special_notes_field.dart';

import '../../widgets/compose/region_picker_section.dart';

import '../../widgets/compose/time_slot_field.dart';

import '../../widgets/compose/work_kind_section.dart';

import '../../widgets/magam_sync_consent_tile.dart';

import '../../widgets/schedule_date_field.dart';

import '../../constants/region_registry.g.dart';



class ComposeScreen extends StatefulWidget {

  const ComposeScreen({super.key});



  @override

  State<ComposeScreen> createState() => _ComposeScreenState();

}



class _ComposeScreenState extends State<ComposeScreen> {

  final _pyeongController = TextEditingController();

  final _otherDetailController = TextEditingController();

  final _specialNotesController = TextEditingController();

  final _phoneController = TextEditingController();

  final _priceController = TextEditingController();



  String _listingType = 'subcontract';

  String? _workKind;

  late String _cityId;

  late String _districtSlug;

  DateTime? _scheduleDate;

  String? _timeSlot;

  String _priceUnit = 'man';

  Set<String> _acTypes = {};

  bool _disclosed = false;

  bool _alreadyConsented = false;

  bool _consentLoading = true;

  bool _loading = false;

  String? _error;

  List<RecentRegion> _recentRegions = [];



  late final MagamRepository _repo;

  late final MagamConsentService _consent;

  late final MagamProfileService _profile;

  late final RecentRegionsStore _recentStore;



  List<MagamRegionCity> get _cities {

    final list = List<MagamRegionCity>.from(kMagamRegionCities);

    list.sort((a, b) {

      if (a.id == 'seoul') return -1;

      if (b.id == 'seoul') return 1;

      return a.label.compareTo(b.label);

    });

    return list;

  }



  ListingDraft? get _draft {

    if (_workKind == null) return null;

    return ListingDraft(

      listingType: _listingType,

      cityId: _cityId,

      districtSlug: _districtSlug,

      workKind: _workKind!,

      scheduleDate: _scheduleDate,

      timeSlot: _timeSlot,

      pyeong: int.tryParse(_pyeongController.text.trim()),

      acTypes: _acTypes.toList(),

      otherDetail: _otherDetailController.text.trim().isEmpty

          ? null

          : _otherDetailController.text.trim(),

      specialNotes: _specialNotesController.text.trim().isEmpty

          ? null

          : _specialNotesController.text.trim(),

      priceAmount: PriceField.parseAmount(_priceController.text, _priceUnit),

      priceUnit: _priceUnit,

    );

  }



  @override

  void initState() {

    super.initState();

    final client = Supabase.instance.client;

    _repo = MagamRepository(client);

    _consent = MagamConsentService(client);

    _profile = MagamProfileService(client);

    _recentStore = RecentRegionsStore();

    _cityId = kMagamDefaultCity.id;

    _districtSlug = kMagamDefaultCity.districts.first.slug;

    _bootstrap();

  }



  Future<void> _bootstrap() async {
    var granted = false;
    String? phone;
    var recent = <RecentRegion>[];

    try {
      granted = await _consent.hasSyncConsent();
    } catch (_) {}

    try {
      phone = await _profile.loadContactPhone();
    } catch (_) {}

    try {
      recent = await _recentStore.load();
    } catch (_) {
      recent = [];
    }

    if (!mounted) return;
    setState(() {
      _alreadyConsented = granted;
      _disclosed = granted;
      _consentLoading = false;
      _recentRegions = recent;
      if (phone != null) _phoneController.text = KrPhoneFormat.formatInput(phone);
    });
  }



  @override

  void dispose() {

    _pyeongController.dispose();

    _otherDetailController.dispose();

    _specialNotesController.dispose();

    _phoneController.dispose();

    _priceController.dispose();

    super.dispose();

  }



  void _onCityChanged(String cityId) {

    final city = magamCityById(cityId);

    if (city == null || city.districts.isEmpty) return;

    setState(() {

      _cityId = cityId;

      _districtSlug = city.districts.first.slug;

    });

  }



  void _onRecentSelected(RecentRegion recent) {

    setState(() {

      _cityId = recent.cityId;

      _districtSlug = recent.districtSlug;

    });

  }



  String? _validate() {

    if (_workKind == null) return '작업 종류를 선택해 주세요.';

    if (_workKind == 'move_in_new' || _workKind == 'move_out') {

      final p = int.tryParse(_pyeongController.text.trim());

      if (p == null || p <= 0) return '평형을 입력해 주세요.';

    }

    if (_workKind == 'ac' && _acTypes.isEmpty) {

      return '에어컨 종류를 하나 이상 선택해 주세요.';

    }

    if (_workKind == 'other' && _otherDetailController.text.trim().length < 4) {

      return '어떤 청소인지 4자 이상 입력해 주세요.';

    }

    if (KrPhoneFormat.digitsOnly(_phoneController.text).length < 10) {

      return '연락처를 입력해 주세요.';

    }

    if (!_disclosed) {

      return '「모집 안내 노출 동의」에 체크해야 글을 올릴 수 있습니다.';

    }

    return null;

  }



  Future<void> _submit() async {

    final validation = _validate();

    if (validation != null) {

      setState(() => _error = validation);

      return;

    }



    final draft = _draft!;

    setState(() {

      _loading = true;

      _error = null;

    });



    try {

      if (!_alreadyConsented) {

        await _consent.recordSyncConsent();

      }



      final phone = KrPhoneFormat.normalize(_phoneController.text.trim());

      await _profile.saveContactPhone(phone);

      await _recentStore.push(_cityId, _districtSlug);



      final created = await _repo.createListing(

        listingType: draft.listingType,

        regionGu: draft.regionLabel,

        cityId: draft.cityId,

        districtSlug: draft.districtSlug,

        bodyText: draft.buildBodyText(),

        contactPhone: phone,

        workKind: draft.workKind,

        scheduleDate: draft.scheduleDate,

        timeSlot: draft.timeSlot,

        pyeong: draft.pyeong,

        acTypes: draft.acTypes,

        priceAmount: draft.priceAmount,

        priceUnit: draft.priceAmount != null ? draft.priceUnit : null,

        priceText: draft.priceLabel,

        scheduleText: draft.scheduleLabel,

        specialNotes: draft.specialNotes,

        linkedServiceDisclosed: _disclosed,

      );

      if (!mounted) return;

      context.go('/listing/${created.id}?new=1');

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
    final draft = _draft;
    final preview = draft?.buildPreviewLine();

    return Scaffold(
      appBar: AppBar(title: const Text('글쓰기')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          ComposeSection(
            step: '1',
            title: '언제',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ScheduleDateField(
                  selectedDate: _scheduleDate,
                  enabled: !_loading,
                  compact: true,
                  onDateChanged: (date) => setState(() => _scheduleDate = date),
                ),
                const SizedBox(height: 16),
                const MagamSubLabel('시간대 (선택)'),
                const SizedBox(height: 10),
                TimeSlotField(
                  selected: _timeSlot,
                  enabled: !_loading,
                  onChanged: (slot) => setState(() => _timeSlot = slot),
                ),
              ],
            ),
          ),
          ComposeSection(
            step: '2',
            title: '어디',
            child: RegionPickerSection(
              cities: _cities,
              cityId: _cityId,
              districtSlug: _districtSlug,
              recentRegions: _recentRegions,
              enabled: !_loading,
              onCityChanged: _onCityChanged,
              onDistrictChanged: (slug) => setState(() => _districtSlug = slug),
              onRecentSelected: _onRecentSelected,
            ),
          ),
          ComposeSection(
            step: '3',
            title: '어떤 일',
            child: WorkKindSection(
              listingType: _listingType,
              workKind: _workKind,
              pyeongController: _pyeongController,
              otherDetailController: _otherDetailController,
              acTypes: _acTypes,
              enabled: !_loading,
              onListingTypeChanged: (type) => setState(() => _listingType = type),
              onWorkKindChanged: (kind) => setState(() {
                _workKind = kind;
                if (kind != 'ac') _acTypes = {};
                if (kind != 'move_in_new' && kind != 'move_out') {
                  _pyeongController.clear();
                }
                if (kind != 'other') {
                  _otherDetailController.clear();
                }
              }),
              onAcTypesChanged: (types) => setState(() => _acTypes = types),
            ),
          ),
          ComposeSection(
            step: '4',
            title: '얼마',
            child: PriceField(
              controller: _priceController,
              unit: _priceUnit,
              enabled: !_loading,
              onUnitChanged: (unit) => setState(() => _priceUnit = unit),
            ),
          ),
          ComposeSection(
            step: '5',
            title: '특이사항',
            child: SpecialNotesField(
              controller: _specialNotesController,
              enabled: !_loading,
            ),
          ),
          ComposeSection(
            step: '6',
            title: '연락처',
            child: TextField(
              controller: _phoneController,
              enabled: !_loading,
              keyboardType: TextInputType.phone,
              onChanged: (v) {
                final formatted = KrPhoneFormat.formatInput(v);
                if (formatted != v) {
                  _phoneController.value = TextEditingValue(
                    text: formatted,
                    selection: TextSelection.collapsed(offset: formatted.length),
                  );
                }
              },
              decoration: const InputDecoration(
                hintText: '010-0000-0000',
                helperText: '다음 글쓰기 때 자동으로 채워집니다',
              ),
            ),
          ),
          if (preview != null && preview.isNotEmpty)
            MagamPreviewCard(text: preview),
          if (_consentLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else if (_alreadyConsented)
            const MagamSyncConsentGrantedBanner()
          else
            MagamSyncConsentTile(
              checked: _disclosed,
              enabled: !_loading,
              onChanged: (v) => setState(() => _disclosed = v),
            ),
          if (_error != null) MagamErrorBanner(message: _error!),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: Text(_loading ? '등록 중…' : '등록하고 링크 받기'),
          ),
        ],
      ),
    );
  }
}


