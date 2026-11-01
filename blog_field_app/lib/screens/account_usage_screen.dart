import "package:flutter/material.dart";
import "package:url_launcher/url_launcher.dart";

import "../field_scope.dart";

class AccountUsageScreen extends StatelessWidget {
  const AccountUsageScreen({super.key});

  Future<void> _openAiBlogMypage() async {
    final uri = Uri.parse("https://www.cleanidex.co.kr/mypage/ai-blog");
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final store = FieldScope.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text("이용 현황")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text("AI 블로그", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(store.accessSummary),
          const SizedBox(height: 16),
          const Text(
            "구독·해지는 웹 마이페이지에서 할 수 있습니다.",
            style: TextStyle(fontSize: 13, color: Color(0xFF71717A)),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: _openAiBlogMypage,
              child: const Text("웹에서 AI 블로그 구독 보기"),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            "앱으로 올린 원본은 완료하거나 14일이 지나면 작은 미리보기만 남습니다.",
            style: TextStyle(fontSize: 12, color: Color(0xFF71717A)),
          ),
        ],
      ),
    );
  }
}
