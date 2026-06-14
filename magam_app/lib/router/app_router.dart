import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../screens/auth/login_screen.dart';
import '../screens/compose/compose_screen.dart';
import '../screens/detail/listing_detail_screen.dart';
import '../screens/home/home_screen.dart';

class AppRouter {
  AppRouter(this._authListenable);

  final Listenable _authListenable;

  late final GoRouter router = GoRouter(
    refreshListenable: _authListenable,
    initialLocation: '/',
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final onLogin = state.matchedLocation == '/login';

      if (session == null && !onLogin) return '/login';
      if (session != null && onLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/compose',
        builder: (context, state) => const ComposeScreen(),
      ),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final justPosted = state.uri.queryParameters['new'] == '1';
          return ListingDetailScreen(
            listingId: id,
            highlightShare: justPosted,
          );
        },
      ),
    ],
  );
}

/// Supabase auth 세션 변경 시 GoRouter 갱신
class AuthRefreshNotifier extends ChangeNotifier {
  AuthRefreshNotifier() {
    Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      notifyListeners();
    });
  }
}
