import "package:flutter/material.dart";
import "package:go_router/go_router.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../field_scope.dart";
import "../widgets/account_nav.dart";

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
    final email = Supabase.instance.client.auth.currentUser?.email ?? "";

    return Scaffold(
      appBar: AppBar(title: const Text("내 정보")),
      bottomNavigationBar: accountBottomNav(context, selectedIndex: 1),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            email.isNotEmpty ? email : "회원",
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text("계정·업체 정보를 카테고리별로 관리합니다.", style: TextStyle(color: Color(0xFF71717A))),
          const SizedBox(height: 12),
          const Divider(),
          AccountMenuTile(
            title: "계정",
            subtitle: "별명·생일·성별·연락처",
            onTap: () => context.push("/account/profile"),
          ),
          const Divider(height: 1),
          AccountMenuTile(
            title: "업체 기본정보",
            subtitle: "AI 블로그에 쓰는 업체·서비스·글 톤",
            onTap: () => context.push("/account/business"),
          ),
          const Divider(height: 1),
          AccountMenuTile(
            title: "이용 현황",
            subtitle: "AI 블로그 이용·구독 안내",
            onTap: () => context.push("/account/usage"),
          ),
          const SizedBox(height: 28),
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
