import "package:flutter/material.dart";
import "package:go_router/go_router.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../field_scope.dart";
import "../theme/app_theme.dart";
import "../widgets/account_nav.dart";
import "../widgets/brand_logo.dart";

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);
    final email = Supabase.instance.client.auth.currentUser?.email ?? "";
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: brandAppBar(title: "내 정보"),
      bottomNavigationBar: accountBottomNav(context, selectedIndex: 2),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.md, AppSpace.md, AppSpace.xl),
        children: [
          const BrandLogo(size: 56),
          const SizedBox(height: 12),
          Text(email.isNotEmpty ? email : "회원", style: text.headlineMedium),
          const SizedBox(height: 6),
          Text("계정·업체 정보를 카테고리별로 관리합니다.", style: text.bodySmall),
          const SizedBox(height: AppSpace.lg),
          Material(
            color: AppColors.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpace.radius),
              side: const BorderSide(color: AppColors.line),
            ),
            child: Column(
              children: [
                AccountMenuTile(
                  title: "계정",
                  subtitle: "별명·생일·성별·연락처",
                  onTap: () => context.push("/account/profile"),
                ),
                const Divider(height: 1, indent: 14, endIndent: 14),
                AccountMenuTile(
                  title: "업체 기본정보",
                  subtitle: "AI 블로그에 쓰는 업체·서비스·글 톤",
                  onTap: () => context.push("/account/business"),
                ),
                const Divider(height: 1, indent: 14, endIndent: 14),
                AccountMenuTile(
                  title: "이용 현황",
                  subtitle: "AI 블로그 이용·구독 안내",
                  onTap: () => context.push("/account/usage"),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.xl),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              side: const BorderSide(color: Color(0xFFFECACA), width: 1.5),
            ),
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
