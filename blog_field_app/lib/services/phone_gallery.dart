import "package:flutter/foundation.dart";
import "package:flutter/services.dart";
import "package:gal/gal.dart";

const _galleryChannel = MethodChannel("blog_field_app/gallery");

/// 원본 JPEG를 현장 폴더에 넣는다. 실패해도 서버 업로드는 계속한다.
Future<bool> saveJpegToPhoneGallery(Uint8List bytes, String name, {required String album}) async {
  try {
    await Gal.putImageBytes(bytes, album: album, name: name);
    return true;
  } on GalException catch (e) {
    if (e.type != GalExceptionType.accessDenied) {
      debugPrint("gallery $e");
      return false;
    }
  } catch (e) {
    debugPrint("gallery $e");
    return false;
  }
  final granted = await Gal.requestAccess(toAlbum: true);
  if (!granted) return false;
  try {
    await Gal.putImageBytes(bytes, album: album, name: name);
    return true;
  } catch (e) {
    debugPrint("gallery $e");
    return false;
  }
}

Future<void> deleteGalleryImage(String album, String name) async {
  try {
    await _galleryChannel.invokeMethod<bool>("deleteImage", {"album": album, "name": name});
  } catch (e) {
    debugPrint("gallery delete $e");
  }
}
