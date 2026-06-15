import 'runtime_config_stub.dart' show MagamRuntimeValues;
import 'runtime_config_stub.dart'
    if (dart.library.js_interop) 'runtime_config_web.dart' as impl;

export 'runtime_config_stub.dart' show MagamRuntimeValues;

MagamRuntimeValues? readMagamRuntimeConfig() => impl.readMagamRuntimeConfig();
