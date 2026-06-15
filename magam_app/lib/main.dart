import 'package:app_links/app_links.dart';
import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/app_config.dart';
import 'config/runtime_config.dart';
import 'constants/magam_copy.dart';
import 'router/app_router.dart';
import 'theme/magam_theme.dart';

class MagamApp extends StatelessWidget {
  MagamApp({super.key, required this.authNotifier});

  final AuthRefreshNotifier authNotifier;
  late final AppRouter _appRouter = AppRouter(authNotifier);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: magamAppName,
      locale: const Locale('ko', 'KR'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ko', 'KR'),
      ],
      theme: buildMagamTheme(),
      routerConfig: _appRouter.router,
    );
  }
}

Future<void> _recoverOAuthSession(Uri uri) async {
  if (!uri.hasQuery && uri.fragment.isEmpty) return;
  try {
    await Supabase.instance.client.auth.getSessionFromUrl(uri);
  } catch (_) {
    // OAuth 콜백이 아닌 딥링크
  }
}

Future<void> _bindMobileAuthDeepLinks() async {
  if (kIsWeb) return;

  final appLinks = AppLinks();

  try {
    final initial = await appLinks.getInitialLink();
    if (initial != null) {
      await _recoverOAuthSession(initial);
    }
  } catch (_) {}

  appLinks.uriLinkStream.listen((uri) async {
    await _recoverOAuthSession(uri);
  });
}

Future<void> _ensureWebRuntimeConfig() async {
  if (!kIsWeb) return;

  AppConfig.useRuntimeConfig(readMagamRuntimeConfig());
  if (AppConfig.isConfigured) return;

  try {
    final uri = Uri.base.resolve('/api/magam/pwa-config');
    final res = await http.get(uri);
    if (res.statusCode != 200) return;
    final json = jsonDecode(res.body) as Map<String, dynamic>;
    final url = json['supabaseUrl']?.toString().trim() ?? '';
    final key = json['supabaseAnonKey']?.toString().trim() ?? '';
    final share = json['shareBaseUrl']?.toString().trim();
    if (url.isEmpty || key.isEmpty) return;
    AppConfig.useRuntimeConfig(
      MagamRuntimeValues(
        supabaseUrl: url,
        supabaseAnonKey: key,
        shareBaseUrl: share != null && share.isNotEmpty ? share : null,
      ),
    );
  } catch (_) {
    // 오프라인·로컬 dev
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // .env 없으면 --dart-define 또는 웹 런타임 설정 사용
  }

  await _ensureWebRuntimeConfig();

  if (!AppConfig.isConfigured) {
    runApp(const _ConfigErrorApp());
    return;
  }

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
      detectSessionInUri: true,
    ),
  );

  if (kIsWeb) {
    try {
      await Supabase.instance.client.auth.getSessionFromUrl(Uri.base);
    } catch (_) {
      // 일반 진입 URL이면 무시
    }
  } else {
    await _bindMobileAuthDeepLinks();
  }

  final authNotifier = AuthRefreshNotifier();
  runApp(MagamApp(authNotifier: authNotifier));
}

class _ConfigErrorApp extends StatelessWidget {
  const _ConfigErrorApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  '환경 설정 필요',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 12),
                Text(
                  'magam_app/.env.example 을 .env 로 복사한 뒤\n'
                  'SUPABASE_URL, SUPABASE_ANON_KEY 를 입력하세요.\n\n'
                  '또는 flutter build apk --dart-define-from-file=.env',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
