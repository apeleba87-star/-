import 'package:flutter/material.dart';

class SpecialNotesField extends StatelessWidget {
  const SpecialNotesField({
    super.key,
    required this.controller,
    this.enabled = true,
  });

  final TextEditingController controller;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      maxLines: 4,
      minLines: 2,
      decoration: const InputDecoration(
        labelText: '특이사항 (선택)',
        hintText: '예) 엘리베이터 없음, 주차 가능, 반려동물 있음',
        alignLabelWithHint: true,
      ),
    );
  }
}
