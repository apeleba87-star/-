import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text("내 정보")),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 1,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: "현장"),
          NavigationDestination(icon: Icon(Icons.person_outline), label: "내 정보"),
        ],
        onDestinationSelected: (index) {
          if (index == 0) context.go("/");
        },
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(store.accessActive ? "촬영할 수 있습니다." : (store.blockReason ?? "촬영할 수 없습니다.")),
          const SizedBox(height: 12),
          const Text("앱으로 올린 원본은 완료하거나 14일이 지나면 작은 미리보기만 남습니다."),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: () async {
              await store.signOut();
            },
            child: const Text("로그아웃"),
          ),
        ],
      ),
    );
  }
}
