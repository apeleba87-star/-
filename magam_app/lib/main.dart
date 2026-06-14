import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/app_config.dart';
import 'router/app_router.dart';
import 'theme/magam_theme.dart';
class MagamApp extends StatelessWidget {
  MagamApp({super.key, required this.authNotifier});

  final AuthRefreshNotifier authNotifier;
  late final AppRouter _appRouter = AppRouter(authNotifier);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '마감 앱',
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

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // .env 없으면 --dart-define 사용
  }

  if (!AppConfig.isConfigured) {
    runApp(const _ConfigErrorApp());
    return;
  }

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
    authOptions: FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
      detectSessionInUri: true,
    ),
  );

  // OAuth(카카오) PKCE 콜백 URL에서 세션 복구
  try {
    await Supabase.instance.client.auth.getSessionFromUrl(Uri.base);
  } catch (_) {
    // 일반 진입 URL이면 무시
  }

  final authNotifier = AuthRefreshNotifier();  runApp(MagamApp(authNotifier: authNotifier));
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
                  '또는 flutter run --dart-define-from-file=.env',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
