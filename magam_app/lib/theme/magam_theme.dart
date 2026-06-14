import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 마감 앱 디자인 토큰 — 2026 세련된 라이트 UI
abstract final class MagamColors {
  static const ink = Color(0xFF141824);
  static const inkMuted = Color(0xFF5B6472);
  static const inkFaint = Color(0xFF8B93A1);
  static const canvas = Color(0xFFF2F3F6);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFE3E6EC);
  static const accent = Color(0xFF2563EB);
  static const accentSoft = Color(0xFFEEF3FF);
  static const success = Color(0xFF059669);
  static const successSoft = Color(0xFFECFDF5);
  static const danger = Color(0xFFDC2626);
  static const dangerSoft = Color(0xFFFEF2F2);

  /// 도급 — 파란 계열
  static const subcontract = Color(0xFF2563EB);
  static const subcontractSoft = Color(0xFFEEF3FF);

  /// 구인 — 주황 계열
  static const hiring = Color(0xFFEA580C);
  static const hiringSoft = Color(0xFFFFF7ED);

  static const closedSurface = Color(0xFFF3F4F6);
  static const closedBorder = Color(0xFFE5E7EB);

  static const radiusLg = 18.0;
  static const radiusMd = 14.0;
  static const radiusSm = 10.0;
}

ThemeData buildMagamTheme() {
  final base = ColorScheme.fromSeed(
    seedColor: MagamColors.accent,
    brightness: Brightness.light,
    surface: MagamColors.surface,
  );

  final scheme = base.copyWith(
    primary: MagamColors.ink,
    onPrimary: Colors.white,
    primaryContainer: MagamColors.accentSoft,
    onPrimaryContainer: MagamColors.accent,
    secondary: MagamColors.accent,
    onSecondary: Colors.white,
    surface: MagamColors.surface,
    onSurface: MagamColors.ink,
    onSurfaceVariant: MagamColors.inkMuted,
    outline: MagamColors.border,
    outlineVariant: Color(0xFFF0F1F4),
    error: MagamColors.danger,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: MagamColors.canvas,
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: MagamColors.canvas,
      foregroundColor: MagamColors.ink,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: MagamColors.ink,
        letterSpacing: -0.3,
      ),
      systemOverlayStyle: SystemUiOverlayStyle.dark,
    ),
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        fontSize: 26,
        fontWeight: FontWeight.w800,
        color: MagamColors.ink,
        letterSpacing: -0.6,
        height: 1.2,
      ),
      titleLarge: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: MagamColors.ink,
        letterSpacing: -0.3,
      ),
      titleMedium: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: MagamColors.ink,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        height: 1.5,
        color: MagamColors.ink,
      ),
      bodyMedium: TextStyle(
        fontSize: 15,
        height: 1.45,
        color: MagamColors.ink,
      ),
      bodySmall: TextStyle(
        fontSize: 13,
        height: 1.4,
        color: MagamColors.inkMuted,
      ),
      labelLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
      ),
    ),
    cardTheme: CardThemeData(
      color: MagamColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
        side: const BorderSide(color: MagamColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: MagamColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        borderSide: const BorderSide(color: MagamColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        borderSide: const BorderSide(color: MagamColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        borderSide: const BorderSide(color: MagamColors.accent, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        borderSide: const BorderSide(color: MagamColors.danger),
      ),
      labelStyle: const TextStyle(color: MagamColors.inkMuted, fontSize: 14),
      hintStyle: const TextStyle(color: MagamColors.inkFaint, fontSize: 15),
      helperStyle: const TextStyle(color: MagamColors.inkFaint, fontSize: 12),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: MagamColors.ink,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: MagamColors.ink,
        side: const BorderSide(color: MagamColors.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: MagamColors.accent,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: MagamColors.ink,
      foregroundColor: Colors.white,
      elevation: 2,
      extendedPadding: const EdgeInsets.symmetric(horizontal: 20),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: MagamColors.surface,
      selectedColor: MagamColors.accentSoft,
      disabledColor: const Color(0xFFF0F1F4),
      labelStyle: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: MagamColors.ink,
      ),
      secondaryLabelStyle: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: MagamColors.accent,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusSm),
        side: const BorderSide(color: MagamColors.border),
      ),
      showCheckmark: false,
    ),
    dividerTheme: const DividerThemeData(
      color: MagamColors.border,
      thickness: 1,
      space: 1,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusSm),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: MagamColors.accent,
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return MagamColors.accent;
        return Colors.transparent;
      }),
      side: const BorderSide(color: MagamColors.border, width: 1.5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
      ),
    ),
  );
}
