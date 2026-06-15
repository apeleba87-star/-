import 'dart:js_interop';

import 'runtime_config_stub.dart';

extension type _MagamRuntimeConfig(JSObject _) implements JSObject {
  external String? get supabaseUrl;
  external String? get supabaseAnonKey;
  external String? get shareBaseUrl;
}

@JS('window.__MAGAM_CONFIG__')
external _MagamRuntimeConfig? get _magamRuntimeConfig;

MagamRuntimeValues? readMagamRuntimeConfig() {
  final cfg = _magamRuntimeConfig;
  if (cfg == null) return null;
  final url = cfg.supabaseUrl?.trim() ?? '';
  final key = cfg.supabaseAnonKey?.trim() ?? '';
  if (url.isEmpty || key.isEmpty) return null;
  final share = cfg.shareBaseUrl?.trim();
  return MagamRuntimeValues(
    supabaseUrl: url,
    supabaseAnonKey: key,
    shareBaseUrl: share != null && share.isNotEmpty ? share : null,
  );
}
