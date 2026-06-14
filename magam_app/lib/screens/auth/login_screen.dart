import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../config/auth_redirect.dart';
import '../../theme/magam_theme.dart';
import '../../widgets/magam_section_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _kakaoLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signInWithPassword() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (!email.contains('@')) {
      setState(() => _error = '올바른 이메일을 입력해 주세요.');
      return;
    }
    if (password.isEmpty) {
      setState(() => _error = '비밀번호를 입력해 주세요.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: password,
      );
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
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

  Future<void> _signInWithKakao() async {
    setState(() {
      _kakaoLoading = true;
      _error = null;
    });

    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.kakao,
        redirectTo: AuthRedirect.oauthRedirect,
        authScreenLaunchMode: kIsWeb
            ? LaunchMode.platformDefault
            : LaunchMode.externalApplication,
      );
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _kakaoLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _kakaoLoading = false;
      });
    } finally {
      if (mounted) setState(() => _kakaoLoading = false);
    }
  }

  Future<void> _openSignup() async {
    final uri = Uri.parse(AuthRedirect.signupUrl(AppConfig.shareBaseUrl));
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      setState(() => _error = '회원가입 페이지를 열 수 없습니다.');
    }
  }

  Future<void> _openSupabaseRedirectSettings() async {
    final url = AppConfig.supabaseAuthUrlConfigLink;
    if (url == null) return;
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      setState(() => _error = 'Supabase 설정 페이지를 열 수 없습니다.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = _loading || _kakaoLoading;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: MagamColors.ink,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.check_circle_outline, color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 20),
                  Text('마감 앱', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 8),
                  Text(
                    '카카오 또는 이메일로 로그인하세요',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  MagamSectionCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_error != null) ...[
                          MagamErrorBanner(message: _error!),
                          const SizedBox(height: 16),
                        ],
                        if (kIsWeb) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: MagamColors.accentSoft,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '카카오 로그인 후 다른 주소로 넘어가면 Supabase Redirect URLs 에\n'
                              '${AuthRedirect.oauthRedirect} 가 없어서입니다.\n'
                              '아래 버튼으로 Supabase 설정에 추가하세요.',
                              style: Theme.of(context).textTheme.bodySmall,
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: busy ? null : _openSupabaseRedirectSettings,
                            child: const Text('Supabase Redirect URLs 설정 열기'),
                          ),
                          const SizedBox(height: 16),
                        ],
                        SizedBox(
                          height: 52,
                          child: FilledButton(
                            onPressed: busy ? null : _signInWithKakao,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFFFEE500),
                              foregroundColor: const Color(0xFF191919),
                            ),
                            child: Text(_kakaoLoading ? '연결 중…' : '카카오로 로그인'),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            const Expanded(child: Divider()),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Text('또는', style: Theme.of(context).textTheme.bodySmall),
                            ),
                            const Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          autofillHints: const [AutofillHints.email],
                          decoration: const InputDecoration(labelText: '이메일'),
                          enabled: !busy,
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _passwordController,
                          obscureText: true,
                          autofillHints: const [AutofillHints.password],
                          decoration: const InputDecoration(labelText: '비밀번호'),
                          enabled: !busy,
                          onSubmitted: (_) => busy ? null : _signInWithPassword(),
                        ),
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: busy ? null : _signInWithPassword,
                          child: Text(_loading ? '로그인 중…' : '로그인'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('계정이 없으신가요? ', style: Theme.of(context).textTheme.bodySmall),
                      TextButton(
                        onPressed: busy ? null : _openSignup,
                        child: const Text('회원가입'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
