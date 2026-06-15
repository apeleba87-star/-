import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../constants/magam_copy.dart';
import '../../services/magam_account_service.dart';
import '../../services/magam_consent_service.dart';
import '../../services/magam_profile_service.dart';
import '../../theme/magam_theme.dart';
import '../../utils/kr_phone_format.dart';
import '../../widgets/magam_app_pitch.dart';
import '../../widgets/magam_screen_padding.dart';
import '../../widgets/magam_install_guide_dialog.dart';
import '../../widgets/magam_section_card.dart';
import '../../widgets/magam_sync_consent_tile.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final MagamProfileService _profile;
  late final MagamConsentService _consent;
  late final MagamAccountService _account;

  final _phoneController = TextEditingController();
  bool _loading = true;
  bool _savingPhone = false;
  bool _deletingAccount = false;
  bool _consentGranted = false;
  bool _consentBusy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final client = Supabase.instance.client;
    _profile = MagamProfileService(client);
    _consent = MagamConsentService(client);
    _account = MagamAccountService(client: client);
    _load();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final phone = await _profile.loadContactPhone();
      final granted = await _consent.hasSyncConsent();
      if (!mounted) return;
      if (phone != null) _phoneController.text = phone;
      setState(() {
        _consentGranted = granted;
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

  String _accountLabel() {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return '로그인 필요';
    return user.email ??
        user.userMetadata?['display_name']?.toString() ??
        user.userMetadata?['name']?.toString() ??
        '로그인됨';
  }

  Future<void> _savePhone() async {
    final digits = KrPhoneFormat.digitsOnly(_phoneController.text);
    if (digits.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('연락처 10자리 이상 입력해 주세요.')),
      );
      return;
    }

    setState(() => _savingPhone = true);
    try {
      await _profile.saveContactPhone(_phoneController.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('기본 연락처가 저장됐습니다.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _savingPhone = false);
    }
  }

  Future<void> _setConsent(bool value) async {
    if (_consentBusy) return;

    if (!value && _consentGranted) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('동의 철회'),
          content: const Text(
            '철회하면 새 글 등록 시 다시 동의해야 합니다. 기존에 노출된 공고는 서비스 정책에 따라 유지될 수 있습니다.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('철회')),
          ],
        ),
      );
      if (ok != true) return;
    }

    setState(() => _consentBusy = true);
    try {
      if (value) {
        await _consent.recordSyncConsent();
      } else {
        await _consent.revokeSyncConsent();
      }
      if (!mounted) return;
      setState(() => _consentGranted = value);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _consentBusy = false);
    }
  }

  Future<void> _deleteAccount() async {
    if (_deletingAccount) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(magamDeleteAccountTitle),
        content: const Text(magamDeleteAccountBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: MagamColors.danger),
            child: const Text(magamDeleteAccountConfirm),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _deletingAccount = true);
    try {
      await _account.deleteAccount();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(magamDeleteAccountDone)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _deletingAccount = false);
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

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('페이지를 열 수 없습니다: $url')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final base = AppConfig.shareBaseUrl;

    return Scaffold(
      appBar: AppBar(title: const Text('설정')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: MagamScreenPadding.listWithBottomNav(context),
                children: [
                  if (_error != null) MagamErrorBanner(message: _error!),
                  MagamSectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('계정', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Text(_accountLabel(), style: Theme.of(context).textTheme.bodyMedium),
                        const SizedBox(height: 8),
                        const MagamAppPitch(dense: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  MagamSectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('기본 연락처', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          magamHiringPhoneHelper,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: '연락처',
                            hintText: '010-0000-0000',
                          ),
                          enabled: !_savingPhone,
                          onChanged: (v) {
                            final formatted = KrPhoneFormat.formatInput(v);
                            if (formatted != v) {
                              _phoneController.value = TextEditingValue(
                                text: formatted,
                                selection: TextSelection.collapsed(offset: formatted.length),
                              );
                            }
                          },
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _savingPhone ? null : _savePhone,
                          child: Text(_savingPhone ? '저장 중…' : '연락처 저장'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_consentGranted)
                    const MagamSyncConsentGrantedBanner()
                  else
                    MagamSyncConsentTile(
                      checked: _consentGranted,
                      enabled: !_consentBusy,
                      onChanged: _setConsent,
                    ),
                  if (_consentGranted) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: _consentBusy ? null : () => _setConsent(false),
                        child: const Text('동의 철회'),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  MagamSectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('도움말', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        _LinkTile(
                          label: '이용약관',
                          onTap: () => _openUrl('$base/terms'),
                        ),
                        _LinkTile(
                          label: '개인정보 처리방침',
                          onTap: () => _openUrl('$base/privacy'),
                        ),
                        _LinkTile(
                          label: '고객지원',
                          onTap: () => _openUrl('$base/magam/support'),
                        ),
                        if (kIsWeb)
                          _LinkTile(
                            label: magamInstallGuideTitle,
                            onTap: () => MagamInstallGuideDialog.show(context),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _deletingAccount ? null : _deleteAccount,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: MagamColors.danger,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: Text(_deletingAccount ? '탈퇴 처리 중…' : magamDeleteAccountTitle),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: _signOut,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: MagamColors.danger,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: const Text('로그아웃'),
                  ),
                  const SizedBox(height: 20),
                  Center(
                    child: Text(
                      '$magamAppName · v$magamAppVersion',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: MagamColors.inkFaint,
                          ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _LinkTile extends StatelessWidget {
  const _LinkTile({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      trailing: const Icon(Icons.open_in_new_rounded, size: 18),
      onTap: onTap,
    );
  }
}
