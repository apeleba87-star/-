import 'package:flutter/material.dart';

/// 스크롤 화면 하단 — 시스템 내비게이션(뒤로·홈)과 겹치지 않게
class MagamScreenPadding {
  MagamScreenPadding._();

  static double safeBottom(BuildContext context) =>
      MediaQuery.paddingOf(context).bottom;

  static EdgeInsets list(BuildContext context, {double extraBottom = 16}) {
    return EdgeInsets.fromLTRB(16, 8, 16, extraBottom + safeBottom(context));
  }

  /// FAB·하단 고정 버튼 위 여유
  static EdgeInsets listWithFab(BuildContext context, {double fabClearance = 88}) {
    return list(context, extraBottom: fabClearance);
  }

  static EdgeInsets fab(BuildContext context, {double extra = 16}) {
    return EdgeInsets.only(bottom: extra + safeBottom(context));
  }
}
