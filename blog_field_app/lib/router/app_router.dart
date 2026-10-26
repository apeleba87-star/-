import "package:flutter/material.dart";
import "package:go_router/go_router.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../data/field_store.dart";
import "../screens/account_screen.dart";
import "../screens/camera_screen.dart";
import "../screens/job_create_screen.dart";
import "../screens/job_list_screen.dart";
import "../screens/login_screen.dart";
import "../screens/naver_guide_screen.dart";
import "../screens/place_list_screen.dart";
import "../screens/report_screen.dart";

class AuthRefresh extends ChangeNotifier {
  AuthRefresh(this.store) {
    Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      notifyListeners();
      store.bindSession();
    });
  }

  final FieldStore store;
}

GoRouter buildRouter(AuthRefresh auth) {
  return GoRouter(
    refreshListenable: auth,
    initialLocation: "/",
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final onLogin = state.matchedLocation == "/login";
      if (session == null && !onLogin) return "/login";
      if (session != null && onLogin) return "/";
      return null;
    },
    routes: [
      GoRoute(path: "/login", builder: (context, state) => const LoginScreen()),
      GoRoute(path: "/", builder: (context, state) => const JobListScreen()),
      GoRoute(path: "/account", builder: (context, state) => const AccountScreen()),
      GoRoute(path: "/jobs/new", builder: (context, state) => const JobCreateScreen()),
      GoRoute(
        path: "/jobs/:id",
        builder: (context, state) => PlaceListScreen(jobId: state.pathParameters["id"]!),
      ),
      GoRoute(
        path: "/jobs/:id/naver",
        builder: (context, state) => NaverGuideScreen(jobId: state.pathParameters["id"]!),
      ),
      GoRoute(
        path: "/jobs/:id/report",
        builder: (context, state) => ReportScreen(jobId: state.pathParameters["id"]!),
      ),
      GoRoute(
        path: "/jobs/:id/places/:placeId/:role",
        builder: (context, state) => CameraScreen(
          jobId: state.pathParameters["id"]!,
          placeId: state.pathParameters["placeId"]!,
          role: state.pathParameters["role"]!,
        ),
      ),
    ],
  );
}
