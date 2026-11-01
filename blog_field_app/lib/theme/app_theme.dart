import "package:flutter/material.dart";
import "package:flutter/services.dart";

/// 현장 앱 가독성 토큰 (40~50대 · 햇빛 · 큰 터치).
abstract final class AppColors {
  static const bg = Color(0xFFF7F8FA);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF18181B);
  static const muted = Color(0xFF52525B);
  static const faint = Color(0xFFA1A1AA);
  static const line = Color(0xFFE4E4E7);
  static const primary = Color(0xFF047857);
  static const primarySoft = Color(0xFFECFDF5);
  static const danger = Color(0xFFB91C1C);
  static const chip = Color(0xFFF4F4F5);
}

abstract final class AppSpace {
  static const xs = 8.0;
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 20.0;
  static const xl = 24.0;
  static const radius = 12.0;
  static const buttonHeight = 52.0;
}

ThemeData buildAppTheme() {
  const seed = AppColors.primary;
  final base = ColorScheme.fromSeed(
    seedColor: seed,
    brightness: Brightness.light,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    surface: AppColors.surface,
    onSurface: AppColors.ink,
    error: AppColors.danger,
  );

  final text = TextTheme(
    headlineMedium: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink, height: 1.25),
    titleLarge: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.ink, height: 1.3),
    titleMedium: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink, height: 1.35),
    bodyLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.ink, height: 1.45),
    bodyMedium: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.ink, height: 1.45),
    bodySmall: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.muted, height: 1.4),
    labelLarge: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink),
    labelMedium: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.muted),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: base,
    scaffoldBackgroundColor: AppColors.bg,
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.surface,
      indicatorColor: AppColors.primarySoft,
      elevation: 0,
      height: 72,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 14,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? AppColors.primary : AppColors.muted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(size: 26, color: selected ? AppColors.primary : AppColors.muted);
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(AppSpace.buttonHeight),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpace.radius)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(AppSpace.buttonHeight),
        foregroundColor: AppColors.ink,
        textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        side: const BorderSide(color: AppColors.line, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpace.radius)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppSpace.radius)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppSpace.radius),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppSpace.radius),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      labelStyle: const TextStyle(fontSize: 15, color: AppColors.muted),
      hintStyle: const TextStyle(fontSize: 15, color: AppColors.faint),
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      titleTextStyle: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink),
      subtitleTextStyle: TextStyle(fontSize: 14, color: AppColors.muted, height: 1.35),
      iconColor: AppColors.muted,
      minVerticalPadding: 12,
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpace.radius),
        side: const BorderSide(color: AppColors.line),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.chip,
      selectedColor: AppColors.primarySoft,
      labelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      side: BorderSide.none,
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        textStyle: WidgetStateProperty.all(const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        padding: WidgetStateProperty.all(const EdgeInsets.symmetric(horizontal: 8, vertical: 12)),
        foregroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary;
          return AppColors.muted;
        }),
        backgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primarySoft;
          return AppColors.surface;
        }),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.line, thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.primary),
  );
}
