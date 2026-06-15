import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/magam_theme.dart';

class MagamShell extends StatelessWidget {
  const MagamShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _tabs = [
    _MagamTab(
      label: '내 공고',
      icon: Icons.inbox_outlined,
      selectedIcon: Icons.inbox_rounded,
    ),
    _MagamTab(
      label: '글쓰기',
      icon: Icons.edit_outlined,
      selectedIcon: Icons.edit_rounded,
    ),
    _MagamTab(
      label: '설정',
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: navigationShell.goBranch,
        backgroundColor: MagamColors.surface,
        indicatorColor: MagamColors.accentSoft,
        destinations: [
          for (final tab in _tabs)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.selectedIcon, color: MagamColors.accent),
              label: tab.label,
            ),
        ],
      ),
    );
  }
}

class _MagamTab {
  const _MagamTab({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
