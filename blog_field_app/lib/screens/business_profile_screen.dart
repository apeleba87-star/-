import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../field_scope.dart";
import "../services/business_profile.dart";
import "../services/worker_profile.dart";
import "../widgets/account_nav.dart";

enum _BizTab { contact, services, tone }

class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen> {
  _BizTab _tab = _BizTab.contact;
  BusinessProfileData _profile = const BusinessProfileData();
  final _businessName = TextEditingController();
  final _ownerName = TextEditingController();
  final _phone = TextEditingController();
  final _career = TextEditingController();
  final _baseRegion = TextEditingController();
  final _intro = TextEditingController();
  final _strengths = TextEditingController();
  final _target = TextEditingController();
  final _cta = TextEditingController();
  final _homepage = TextEditingController();
  final _naver = TextEditingController();
  final _customService = TextEditingController();

  var _loading = true;
  var _saving = false;
  var _saved = false;
  String? _error;
  String? _loadError;

  bool get _canEdit {
    final store = FieldScope.of(context);
    return store.companyId != null && store.isAdmin;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _businessName.dispose();
    _ownerName.dispose();
    _phone.dispose();
    _career.dispose();
    _baseRegion.dispose();
    _intro.dispose();
    _strengths.dispose();
    _target.dispose();
    _cta.dispose();
    _homepage.dispose();
    _naver.dispose();
    _customService.dispose();
    super.dispose();
  }

  void _applyToControllers(BusinessProfileData p) {
    _businessName.text = p.businessName;
    _ownerName.text = p.ownerName;
    _phone.text = p.phone;
    _career.text = p.careerYears?.toString() ?? "";
    _baseRegion.text = p.baseRegion;
    _intro.text = p.intro;
    _strengths.text = p.strengths;
    _target.text = p.targetCustomers;
    _cta.text = p.ctaText;
    _homepage.text = p.homepageUrl;
    _naver.text = p.naverPlaceUrl;
  }

  BusinessProfileData _collect() {
    final careerRaw = _career.text.trim();
    return _profile.copyWith(
      businessName: _businessName.text,
      ownerName: _ownerName.text,
      phone: _phone.text,
      baseRegion: _baseRegion.text,
      careerYears: careerRaw.isEmpty ? null : int.tryParse(careerRaw),
      clearCareerYears: careerRaw.isEmpty,
      intro: _intro.text,
      strengths: _strengths.text,
      targetCustomers: _target.text,
      ctaText: _cta.text,
      homepageUrl: _homepage.text,
      naverPlaceUrl: _naver.text,
    );
  }

  Future<void> _load() async {
    final store = FieldScope.of(context);
    final companyId = store.companyId;
    if (companyId == null) {
      setState(() {
        _loading = false;
        _loadError = "업체가 연결된 대표 계정으로 로그인해 주세요.";
      });
      return;
    }
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final loaded = await loadBusinessProfile(Supabase.instance.client, companyId);
      if (!mounted) return;
      _profile = loaded ?? BusinessProfileData(companyId: companyId);
      _applyToControllers(_profile);
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = "업체 정보를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.";
      });
    }
  }

  Future<void> _save() async {
    final store = FieldScope.of(context);
    final companyId = store.companyId;
    if (companyId == null) {
      setState(() => _error = "업체가 연결된 대표 계정으로 로그인해 주세요.");
      return;
    }
    if (!store.isAdmin) {
      setState(() => _error = "업체 대표 계정만 수정할 수 있습니다.");
      return;
    }
    final next = _collect();
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
      _profile = next;
    });
    final err = await saveBusinessProfile(
      Supabase.instance.client,
      companyId: companyId,
      profile: next,
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (err != null) {
        _error = err;
      } else {
        _saved = true;
      }
    });
  }

  void _markDirty() {
    if (_saved || _error != null) {
      setState(() {
        _saved = false;
        _error = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = !_loading && _canEdit;

    return Scaffold(
      appBar: AppBar(title: const Text("업체 기본정보")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "AI 블로그 초안에 자동으로 들어가는 업체 정보입니다.",
                        style: TextStyle(fontSize: 13, color: Color(0xFF71717A)),
                      ),
                      if (!_canEdit) ...[
                        const SizedBox(height: 8),
                        Text(
                          FieldScope.of(context).companyId == null
                              ? "업체가 연결된 대표 계정으로 로그인해 주세요."
                              : "업체 대표 계정만 수정할 수 있습니다.",
                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                        ),
                      ],
                      if (_loadError != null) ...[
                        const SizedBox(height: 8),
                        Text(_loadError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                        TextButton(onPressed: _load, child: const Text("다시 불러오기")),
                      ],
                      const SizedBox(height: 12),
                      SegmentedButton<_BizTab>(
                        segments: const [
                          ButtonSegment(
                            value: _BizTab.contact,
                            label: Text("업체·연락·지역", style: TextStyle(fontSize: 11)),
                          ),
                          ButtonSegment(
                            value: _BizTab.services,
                            label: Text("서비스", style: TextStyle(fontSize: 11)),
                          ),
                          ButtonSegment(
                            value: _BizTab.tone,
                            label: Text("글 톤·소개", style: TextStyle(fontSize: 11)),
                          ),
                        ],
                        selected: {_tab},
                        onSelectionChanged: (next) {
                          if (next.isEmpty) return;
                          setState(() {
                            _profile = _collect();
                            _tab = next.first;
                          });
                        },
                        showSelectedIcon: false,
                      ),
                      if (_saved) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: const Text("저장했습니다.", style: TextStyle(color: Color(0xFF065F46))),
                        ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 8),
                        Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ],
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_tab == _BizTab.contact) _contactFields(canEdit),
                      if (_tab == _BizTab.services) _serviceFields(canEdit),
                      if (_tab == _BizTab.tone) _toneFields(canEdit),
                      const SizedBox(height: 16),
                      if (canEdit)
                        FilledButton(
                          onPressed: _saving ? null : _save,
                          child: Text(_saving ? "저장 중…" : "저장"),
                        ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      );

  Widget _hint(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFFA1A1AA))),
      );

  Widget _contactFields(bool canEdit) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label("업체명 *"),
        TextField(
          controller: _businessName,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "예: OO클린"),
        ),
        const SizedBox(height: 14),
        _label("대표자명"),
        TextField(
          controller: _ownerName,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder()),
        ),
        const SizedBox(height: 14),
        _label("연락처"),
        _hint("글 마지막 상담 안내에 들어갑니다."),
        TextField(
          controller: _phone,
          enabled: canEdit,
          keyboardType: TextInputType.phone,
          onChanged: (value) {
            final formatted = formatPhoneInput(value);
            if (formatted != value) {
              _phone.value = TextEditingValue(
                text: formatted,
                selection: TextSelection.collapsed(offset: formatted.length),
              );
            }
            _markDirty();
          },
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "010-0000-0000"),
        ),
        const SizedBox(height: 14),
        _label("업체 경력 (년)"),
        TextField(
          controller: _career,
          enabled: canEdit,
          keyboardType: TextInputType.number,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder()),
        ),
        const SizedBox(height: 14),
        _label("활동 지역"),
        TextField(
          controller: _baseRegion,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "예: 서울 강서구"),
        ),
        const SizedBox(height: 14),
        _label("서비스 가능 지역"),
        _hint("지역을 입력한 뒤 추가하세요."),
        TagEditor(
          values: _profile.serviceRegions,
          enabled: canEdit,
          hint: "예: 양천구",
          onChanged: (values) {
            setState(() {
              _saved = false;
              _profile = _collect().copyWith(serviceRegions: values);
            });
          },
        ),
      ],
    );
  }

  Widget _serviceFields(bool canEdit) {
    final selected = _profile.mainServices.toSet();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label("주력 서비스"),
        _hint("목록에 없으면 아래에 직접 추가하세요. 최대 10개."),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final option in kServiceTypeOptions)
              FilterChip(
                label: Text(option),
                selected: selected.contains(option),
                onSelected: canEdit
                    ? (on) {
                        final next = [..._profile.mainServices];
                        if (on) {
                          if (next.length >= 10) return;
                          if (!next.contains(option)) next.add(option);
                        } else {
                          next.remove(option);
                        }
                        setState(() {
                          _saved = false;
                          _profile = _collect().copyWith(mainServices: next);
                        });
                      }
                    : null,
              ),
            for (final custom in _profile.mainServices)
              if (!kServiceTypeOptions.contains(custom))
                FilterChip(
                  label: Text(custom),
                  selected: true,
                  onSelected: canEdit
                      ? (_) {
                          setState(() {
                            _saved = false;
                            _profile = _collect().copyWith(
                              mainServices: [for (final s in _profile.mainServices) if (s != custom) s],
                            );
                          });
                        }
                      : null,
                ),
          ],
        ),
        if (canEdit) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _customService,
                  decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "예: 에어컨 청소"),
                  onSubmitted: (_) => _addCustomService(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _addCustomService, child: const Text("추가")),
            ],
          ),
        ],
      ],
    );
  }

  void _addCustomService() {
    final value = _customService.text.trim();
    if (value.isEmpty) return;
    if (_profile.mainServices.length >= 10) return;
    if (_profile.mainServices.contains(value)) {
      _customService.clear();
      return;
    }
    setState(() {
      _saved = false;
      _profile = _collect().copyWith(mainServices: [..._profile.mainServices, value]);
      _customService.clear();
    });
  }

  Widget _toneFields(bool canEdit) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label("원하는 글 스타일"),
        _hint("초안 생성 화면의 기본 모드가 됩니다."),
        Wrap(
          spacing: 8,
          children: [
            for (final item in const [
              ("story", "후기처럼"),
              ("expert", "전문가처럼"),
              ("checkpoint", "짧게"),
            ])
              ChoiceChip(
                label: Text(item.$2),
                selected: _profile.writingStyle == item.$1,
                onSelected: canEdit
                    ? (_) {
                        setState(() {
                          _saved = false;
                          _profile = _collect().copyWith(writingStyle: item.$1);
                        });
                      }
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 14),
        _label("업체 소개"),
        TextField(
          controller: _intro,
          enabled: canEdit,
          minLines: 4,
          maxLines: 8,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "어떤 업체인지 두세 줄로"),
        ),
        const SizedBox(height: 14),
        _label("업체 강점"),
        TextField(
          controller: _strengths,
          enabled: canEdit,
          minLines: 4,
          maxLines: 8,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: "예: 공사 후 분진 제거, 3인 1팀 반나절 마무리",
          ),
        ),
        const SizedBox(height: 14),
        _label("주요 고객층"),
        TextField(
          controller: _target,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "예: 신혼부부, 아이 있는 집"),
        ),
        const SizedBox(height: 14),
        _label("기본 상담 문구"),
        _hint("글 마지막 문단에 들어갑니다."),
        TextField(
          controller: _cta,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: "예: 강서구 입주청소 상담은 편하게 연락 주세요.",
          ),
        ),
        const SizedBox(height: 14),
        _label("홈페이지"),
        TextField(
          controller: _homepage,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "https://"),
        ),
        const SizedBox(height: 14),
        _label("네이버 플레이스"),
        TextField(
          controller: _naver,
          enabled: canEdit,
          onChanged: (_) => _markDirty(),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "https://naver.me/..."),
        ),
        const SizedBox(height: 14),
        _label("사용하지 않을 표현"),
        _hint("입력 후 추가. AI 글에서 자동으로 빠집니다."),
        TagEditor(
          values: _profile.bannedPhrases,
          enabled: canEdit,
          hint: "예: 최저가",
          onChanged: (values) {
            setState(() {
              _saved = false;
              _profile = _collect().copyWith(bannedPhrases: values);
            });
          },
        ),
      ],
    );
  }
}
