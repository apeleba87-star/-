import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../screens/contaminant_detail_screen.dart';
import '../screens/contaminants_screen.dart';
import '../screens/home_screen.dart';
import '../screens/method_screen.dart';
import '../screens/product_detail_screen.dart';
import '../screens/products_screen.dart';
import '../screens/search_screen.dart';
import '../theme/app_theme.dart';

final GlobalKey<NavigatorState> _rootNavKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _homeNavKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _pollutionNavKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _productsNavKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter() {
  return GoRouter(
    navigatorKey: _rootNavKey,
    initialLocation: '/home',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            navigatorKey: _homeNavKey,
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _pollutionNavKey,
            routes: [
              GoRoute(
                path: '/pollution',
                builder: (context, state) => const ContaminantsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => ContaminantDetailScreen(
                      id: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _productsNavKey,
            routes: [
              GoRoute(
                path: '/products',
                builder: (context, state) => const ProductsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => ProductDetailScreen(
                      id: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavKey,
        path: '/methods/:slug',
        builder: (context, state) => MethodScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavKey,
        path: '/search',
        builder: (context, state) => SearchScreen(
          initialQuery: state.uri.queryParameters['q'] ?? '',
        ),
      ),
    ],
  );
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(index),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFE6F7F4),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: kPrimary),
            label: '홈',
          ),
          NavigationDestination(
            icon: Icon(Icons.water_drop_outlined),
            selectedIcon: Icon(Icons.water_drop, color: kPrimary),
            label: '오염',
          ),
          NavigationDestination(
            icon: Icon(Icons.science_outlined),
            selectedIcon: Icon(Icons.science, color: kPrimary),
            label: '세제',
          ),
        ],
      ),
    );
  }
}
