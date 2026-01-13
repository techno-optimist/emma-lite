package com.yourorg.emma.nativeapp.ui.orb

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.graphics.ColorUtils
import com.yourorg.emma.nativeapp.ui.theme.EmmaThemes
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette

@Composable
fun EmorbSurface(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val orbView = remember(context) { EmorbView(context) }
    val palette = LocalEmmaPalette.current
    val hueShift = remember(palette.primary) { orbHueShift(palette.primary) }

    DisposableEffect(orbView) {
        EmorbRegistry.activate(orbView)
        onDispose {
            // SurfaceView can linger briefly during nav; hide it as soon as it's disposed.
            EmorbRegistry.deactivate(orbView)
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { orbView },
        update = {
            it.setHueShift(hueShift)
            EmorbRegistry.activate(it)
        }
    )
}

@Composable
fun EmorbSurfaceInline(
    modifier: Modifier = Modifier,
    backgroundColor: Color? = null
) {
    val context = LocalContext.current
    val orbView = remember(context) { EmorbView(context).apply { setInlineMode(true) } }
    val palette = LocalEmmaPalette.current
    val hueShift = remember(palette.primary) { orbHueShift(palette.primary) }
    val backdropArgb = backgroundColor?.toArgb()
    val backdropEnabled = backgroundColor != null

    DisposableEffect(orbView, backdropArgb, backdropEnabled) {
        orbView.prepareForDisplay()
        orbView.setBackdropColor(backdropArgb, backdropEnabled)
        onDispose {
            orbView.prepareForRemoval()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { orbView },
        update = {
            it.setHueShift(hueShift)
            it.setInlineMode(true)
            it.setBackdropColor(backdropArgb, backdropEnabled)
            it.prepareForDisplay()
        }
    )
}

private const val ORB_BASE_SHIFT = 270f

private fun orbHueShift(target: Color): Float {
    val defaultHue = hueOf(EmmaThemes.default.primary)
    val targetHue = hueOf(target)
    return ORB_BASE_SHIFT + (targetHue - defaultHue)
}

private fun hueOf(color: Color): Float {
    val hsl = FloatArray(3)
    ColorUtils.colorToHSL(color.toArgb(), hsl)
    return hsl[0]
}
