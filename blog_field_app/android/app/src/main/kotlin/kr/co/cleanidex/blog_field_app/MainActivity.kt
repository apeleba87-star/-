package kr.co.cleanidex.blog_field_app

import android.content.ContentUris
import android.os.Build
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "blog_field_app/gallery")
            .setMethodCallHandler { call, result ->
                if (call.method != "deleteImage") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val album = call.argument<String>("album") ?: ""
                val name = call.argument<String>("name") ?: ""
                result.success(deleteImage(album, name))
            }
    }

    private fun deleteImage(album: String, name: String): Boolean {
        if (album.isEmpty() || name.isEmpty()) return false
        val resolver = applicationContext.contentResolver
        val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val display = "$name.jpg"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val relative = "Pictures/$album/"
            val deleted = resolver.delete(
                collection,
                "${MediaStore.MediaColumns.RELATIVE_PATH}=? AND ${MediaStore.MediaColumns.DISPLAY_NAME}=?",
                arrayOf(relative, display),
            )
            if (deleted > 0) return true
            val projection = arrayOf(
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.RELATIVE_PATH,
            )
            resolver.query(
                collection,
                projection,
                "${MediaStore.MediaColumns.DISPLAY_NAME}=?",
                arrayOf(display),
                null,
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)
                val pathCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.RELATIVE_PATH)
                while (cursor.moveToNext()) {
                    val path = cursor.getString(pathCol) ?: continue
                    if (!path.contains(album)) continue
                    val uri = ContentUris.withAppendedId(collection, cursor.getLong(idCol))
                    if (resolver.delete(uri, null, null) > 0) return true
                }
            }
            return false
        }
        val legacy = resolver.delete(
            collection,
            "${MediaStore.MediaColumns.DISPLAY_NAME}=?",
            arrayOf(display),
        )
        return legacy > 0
    }
}
