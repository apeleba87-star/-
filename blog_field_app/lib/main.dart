import "package:flutter/material.dart";
import "package:flutter_dotenv/flutter_dotenv.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "config/app_config.dart";
import "data/field_store.dart";
import "field_scope.dart";
import "router/app_router.dart";
import "theme/app_theme.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: ".env");
  } catch (_) {}
  AppConfig.load(dotenv.isInitialized ? dotenv.env : const {});
  if (!AppConfig.isConfigured) {
    runApp(const ConfigMissingApp());
    return;
  }
  try {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabaseAnonKey,
    );
    final store = FieldStore();
    final auth = AuthRefresh(store);
    // 화면을 먼저 띄우고, 세션·동기화는 뒤에서 (체감 기동 속도).
    runApp(FieldApp(store: store, auth: auth));
    if (Supabase.instance.client.auth.currentSession != null) {
      store.bindSession();
    }
  } catch (e) {
    runApp(BootErrorApp(message: e.toString()));
  }
}

class FieldApp extends StatefulWidget {
  const FieldApp({super.key, required this.store, required this.auth});

  final FieldStore store;
  final AuthRefresh auth;

  @override
  State<FieldApp> createState() => _FieldAppState();
}

class _FieldAppState extends State<FieldApp> {
  late final router = buildRouter(widget.auth);

  @override
  Widget build(BuildContext context) {
    return FieldScope(
      store: widget.store,
      child: MaterialApp.router(
        title: "블로그 촬영",
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        locale: const Locale("ko", "KR"),
        supportedLocales: const [Locale("ko", "KR")],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: router,
      ),
    );
  }
}

class ConfigMissingApp extends StatelessWidget {
  const ConfigMissingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              "blog_field_app/env.sample 을 .env 로 복사한 뒤\nSUPABASE_URL, SUPABASE_ANON_KEY 를 입력하세요.",
            ),
          ),
        ),
      ),
    );
  }
}

class BootErrorApp extends StatelessWidget {
  const BootErrorApp({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text("앱을 시작하지 못했습니다.\n\n$message"),
          ),
        ),
      ),
    );
  }
}
