import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class DilutionHighlight extends StatelessWidget {
  const DilutionHighlight({
    super.key,
    required this.dilution,
    this.label = '희석',
    this.large = false,
  });

  final String dilution;
  final String label;
  final bool large;

  @override
  Widget build(BuildContext context) {
    if (dilution.trim().isEmpty) {
      return Text(
        '희석 정보 없음',
        style: TextStyle(
          fontSize: large ? 16 : 14,
          fontWeight: FontWeight.w700,
          color: kTextSec,
        ),
      );
    }
    return Text.rich(
      TextSpan(
        style: TextStyle(
          fontSize: large ? 28 : 20,
          fontWeight: FontWeight.w900,
          color: kText,
          height: 1.2,
          letterSpacing: -0.5,
        ),
        children: [
          TextSpan(
            text: '$label ',
            style: TextStyle(
              fontSize: large ? 18 : 15,
              fontWeight: FontWeight.w800,
              color: kTextSec,
            ),
          ),
          TextSpan(
            text: dilution,
            style: const TextStyle(color: kPrimary),
          ),
        ],
      ),
    );
  }
}

class SectionHead extends StatelessWidget {
  const SectionHead({
    super.key,
    required this.title,
    this.subtitle,
    this.color = kPrimary,
  });

  final String title;
  final String? subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 22,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.4,
                  ),
                ),
              ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Text(
                subtitle!,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: kTextSec,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class WhiteCard extends StatelessWidget {
  const WhiteCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F1A2A3A),
            blurRadius: 12,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

class PhChip extends StatelessWidget {
  const PhChip({super.key, required this.phApprox});

  final String? phApprox;

  @override
  Widget build(BuildContext context) {
    final raw = phApprox?.trim();
    if (raw == null || raw.isEmpty) return const SizedBox.shrink();
    final label = _shortPh(raw);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: _phColor(raw),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: _phText(raw),
        ),
      ),
    );
  }
}

String _shortPh(String raw) {
  final m = RegExp(r'(?:pH\s*)?(\d+(?:\.\d+)?)', caseSensitive: false).firstMatch(raw);
  if (m != null) return 'pH ${m.group(1)}';
  if (raw.length <= 18) return raw;
  return '${raw.substring(0, 16)}…';
}

Color _phColor(String raw) {
  final m = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(raw);
  final v = m != null ? double.tryParse(m.group(1)!) ?? 7 : 7;
  if (v < 4) return const Color(0xFFE74C3C);
  if (v < 6.5) return const Color(0xFFF39C12);
  if (v <= 7.5) return const Color(0xFF27AE60);
  if (v <= 10.5) return const Color(0xFF3498DB);
  return const Color(0xFF8E44AD);
}

Color _phText(String raw) {
  final m = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(raw);
  final v = m != null ? double.tryParse(m.group(1)!) ?? 7 : 7;
  if (v >= 3.5 && v <= 6.2) return const Color(0xFF1A1A1A);
  return Colors.white;
}

class StepList extends StatelessWidget {
  const StepList({super.key, required this.steps});

  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          WhiteCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: kStepColors[i % kStepColors.length],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${i + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      steps[i],
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        height: 1.55,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class WarningBlock extends StatelessWidget {
  const WarningBlock({super.key, required this.warnings});

  final List<String> warnings;

  @override
  Widget build(BuildContext context) {
    if (warnings.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8F0),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF5D5B0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: kDanger, size: 18),
              SizedBox(width: 6),
              Text(
                '주의사항',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: kDanger,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (final w in warnings) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 7),
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: kDanger,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      w,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
