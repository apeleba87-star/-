import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const Color kBg = Color(0xFFF5F7FB);
const Color kText = Color(0xFF1A2A3A);
const Color kTextSec = Color(0xFF6B7A8D);
const Color kBorder = Color(0xFFE8EDF3);
const Color kPrimary = Color(0xFF0F766E);
const Color kPrimarySoft = Color(0xFF14B8A6);
const Color kAccent = Color(0xFFE67E22);
const Color kDanger = Color(0xFFC0392B);

const List<Color> kStepColors = [
  Color(0xFF0D9488),
  Color(0xFF0984E3),
  Color(0xFFE17055),
  Color(0xFF6C5CE7),
  Color(0xFF00B894),
];

ThemeData buildCleanidexTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: kPrimary,
      brightness: Brightness.light,
      surface: kBg,
    ),
    scaffoldBackgroundColor: kBg,
  );

  final textTheme = GoogleFonts.notoSansKrTextTheme(base.textTheme).apply(
    bodyColor: kText,
    displayColor: kText,
  );

  return base.copyWith(
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: kBg,
      foregroundColor: kText,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      titleTextStyle: textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w900,
        color: kText,
        fontSize: 18,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: kBorder),
      ),
      margin: EdgeInsets.zero,
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: const Color(0xFFF1F5F9),
      labelStyle: textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: kText,
      ),
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: textTheme.bodyMedium?.copyWith(color: kTextSec),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: kBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: kBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: kPrimary, width: 1.5),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: kPrimary,
      unselectedItemColor: kTextSec,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
  );
}
