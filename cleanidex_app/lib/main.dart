import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'router/app_router.dart';
import 'services/knowledge_catalog.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await KnowledgeCatalog.load();
  runApp(const CleanidexApp());
}

class CleanidexApp extends StatelessWidget {
  const CleanidexApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '클린아이덱스',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ko', 'KR'),
      supportedLocales: const [Locale('ko', 'KR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: buildCleanidexTheme(),
      routerConfig: createAppRouter(),
    );
  }
}
