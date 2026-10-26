import 'dart:typed_data';

import 'package:image/image.dart' as img;

const previewLongEdge = 720;

/// 고객 보고서용. 청소 전후가 구분되는 정도만 남긴다.
const reportLongEdge = 480;
const reportJpegQuality = 45;

/// 화면용 JPEG. 원본 바이트는 바꾸지 않는다.
Uint8List? buildPreviewJpeg(Uint8List bytes) {
  final decoded = img.decodeImage(bytes);
  if (decoded == null) return null;
  final longest = decoded.width > decoded.height ? decoded.width : decoded.height;
  final resized = longest <= previewLongEdge
      ? decoded
      : decoded.width >= decoded.height
          ? img.copyResize(decoded, width: previewLongEdge)
          : img.copyResize(decoded, height: previewLongEdge);
  return Uint8List.fromList(img.encodeJpg(resized, quality: 80));
}

/// 보고서 링크용 JPEG. 원본과 720 미리보기는 바꾸지 않는다.
Uint8List? buildReportJpeg(Uint8List bytes) {
  final decoded = img.decodeImage(bytes);
  if (decoded == null) return null;
  final longest = decoded.width > decoded.height ? decoded.width : decoded.height;
  final resized = longest <= reportLongEdge
      ? decoded
      : decoded.width >= decoded.height
          ? img.copyResize(decoded, width: reportLongEdge)
          : img.copyResize(decoded, height: reportLongEdge);
  return Uint8List.fromList(img.encodeJpg(resized, quality: reportJpegQuality));
}
