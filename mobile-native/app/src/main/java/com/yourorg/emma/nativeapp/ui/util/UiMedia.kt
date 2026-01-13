package com.yourorg.emma.nativeapp.ui.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.LruCache
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.IntSize
import com.yourorg.emma.nativeapp.vault.MediaRecord
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.net.URL

fun ByteArray.toImageBitmap(): ImageBitmap? {
    return runCatching {
        BitmapFactory.decodeByteArray(this, 0, size)?.asImageBitmap()
    }.getOrNull()
}

@Composable
fun rememberBitmapFromUrl(url: String?): ImageBitmap? {
    if (url.isNullOrBlank()) return null
    val state = remember(url) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(url) {
        val bmp = withContext(Dispatchers.IO) {
            runCatching { URL(url).openStream().use { BitmapFactory.decodeStream(it)?.asImageBitmap() } }.getOrNull()
        }
        if (bmp != null) state.value = bmp
    }
    return state.value
}

fun Map<String, String>.decodeMediaMap(): Map<String, MediaRecord> {
    val json = Json { ignoreUnknownKeys = true }
    return mapNotNull { (id, raw) ->
        runCatching { json.decodeFromString<MediaRecord>(raw) }.getOrNull()?.let { id to it }
    }.toMap()
}

private val thumbnailCache = LruCache<String, ImageBitmap>(80)

fun decodeMediaThumbnail(record: MediaRecord?, maxPx: Int = 160): ImageBitmap? {
    val data = record?.data ?: return null
    val key = "${record.id}@$maxPx"
    thumbnailCache.get(key)?.let { return it }
    val raw = if (data.startsWith("data:")) data.substringAfter(",") else data
    val bytes = runCatching { Base64.decode(raw, Base64.NO_WRAP) }.getOrNull() ?: return null
    val bitmap = decodeSampledBitmap(bytes, maxPx, maxPx) ?: return null
    val image = bitmap.asImageBitmap()
    thumbnailCache.put(key, image)
    return image
}

private fun decodeSampledBitmap(bytes: ByteArray, reqWidth: Int, reqHeight: Int): Bitmap? {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
    options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)
    options.inJustDecodeBounds = false
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
}

private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
    val height = options.outHeight
    val width = options.outWidth
    var inSampleSize = 1
    if (height > reqHeight || width > reqWidth) {
        var halfHeight = height / 2
        var halfWidth = width / 2
        while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
            inSampleSize *= 2
        }
    }
    return inSampleSize
}

fun androidx.compose.ui.geometry.Size.toIntSizeCompat(): IntSize {
    return IntSize(width.toInt(), height.toInt())
}
