import 'package:flutter/material.dart';

class SpecialNotesField extends StatelessWidget {
  const SpecialNotesField({
    super.key,
    required this.controller,
    required this.hintText,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String hintText;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      maxLines: 4,
      minLines: 2,
      decoration: InputDecoration(
        labelText: '특이사항 (선택)',
        hintText: hintText,
        alignLabelWithHint: true,
      ),
    );
  }
}
