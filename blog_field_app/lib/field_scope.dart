import "package:flutter/material.dart";

import "data/field_store.dart";

class FieldScope extends InheritedNotifier<FieldStore> {
  const FieldScope({super.key, required FieldStore store, required super.child}) : super(notifier: store);

  static FieldStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<FieldScope>();
    assert(scope != null, "FieldScope missing");
    return scope!.notifier!;
  }
}
