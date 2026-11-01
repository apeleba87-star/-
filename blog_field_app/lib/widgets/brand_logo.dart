import "package:flutter/material.dart";

/// 앱 브랜드 마크 (헤더·로그인).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 36, this.rounded = true});

  final double size;
  final bool rounded;

  @override
  Widget build(BuildContext context) {
    final radius = rounded ? BorderRadius.circular(size * 0.22) : BorderRadius.zero;
    return ClipRRect(
      borderRadius: radius,
      child: Image.asset(
        "assets/brand/cleanidex-icon.png",
        width: size,
        height: size,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.high,
        errorBuilder: (context, error, stackTrace) => Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          color: const Color(0xFF1D4ED8),
          child: Text(
            "C",
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: size * 0.48,
            ),
          ),
        ),
      ),
    );
  }
}

PreferredSizeWidget brandAppBar({
  required String title,
  List<Widget>? actions,
  PreferredSizeWidget? bottom,
}) {
  return AppBar(
    titleSpacing: 12,
    title: Row(
      children: [
        const BrandLogo(size: 32),
        const SizedBox(width: 10),
        Flexible(child: Text(title, overflow: TextOverflow.ellipsis)),
      ],
    ),
    actions: actions,
    bottom: bottom,
  );
}
