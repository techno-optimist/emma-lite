package com.yourorg.emma.nativeapp.ui.orb

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.graphics.ColorUtils
import com.yourorg.emma.nativeapp.ui.theme.EmmaThemes
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

@Composable
fun EmorbBadge(
    size: Dp,
    borderColor: Color,
    animated: Boolean = false,
    modifier: Modifier = Modifier
) {
    val density = LocalDensity.current
    val sizePx = with(density) { size.toPx() }
    val palette = LocalEmmaPalette.current
    val hueShift = remember(palette.primary) { orbHueShift(palette.primary) }
    val transition = rememberInfiniteTransition(label = "emorb-badge")
    val pulse by transition.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2400),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    val glowAlpha by transition.animateFloat(
        initialValue = 0.22f,
        targetValue = 0.45f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2600),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )
    val highlightAlpha by transition.animateFloat(
        initialValue = 0.16f,
        targetValue = 0.32f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "highlight"
    )

    val pulseValue = if (animated) pulse else 1f
    val glowValue = if (animated) glowAlpha else 0.35f
    val highlightValue = if (animated) highlightAlpha else 0.28f
    val drift = if (animated) (pulseValue - 1f) * 0.25f else 0f

    val radius = sizePx * 0.5f
    val baseCenter = Offset(sizePx * (0.35f + drift), sizePx * (0.32f - drift))
    val glowCenter = Offset(sizePx * (0.7f - drift), sizePx * (0.74f + drift))
    val highlightCenter = Offset(sizePx * (0.26f + drift), sizePx * (0.22f + drift))
    val baseColor1 = adjustHue(Color(0.611765f, 0.262745f, 0.996078f), hueShift)
    val baseColor2 = adjustHue(Color(0.298039f, 0.760784f, 0.913725f), hueShift)
    val baseColor3 = adjustHue(Color(0.062745f, 0.078431f, 0.6f), hueShift)
    val deepBase = mix(baseColor3, Color.Black, 0.35f)
    val highlight = mix(Color.White, baseColor2, 0.25f)
    val mid = mix(baseColor1, baseColor2, 0.4f)
    val baseBrush = Brush.radialGradient(
        colorStops = arrayOf(
            0f to highlight,
            0.32f to mid,
            0.62f to baseColor1,
            1f to deepBase
        ),
        center = baseCenter,
        radius = radius * 1.35f
    )
    val coreBrush = Brush.radialGradient(
        colors = listOf(
            mix(baseColor1, baseColor2, 0.55f).copy(alpha = 0.7f),
            Color.Transparent
        ),
        center = baseCenter,
        radius = radius * 0.75f
    )
    val glowBrush = Brush.radialGradient(
        colors = listOf(baseColor2.copy(alpha = glowValue), Color.Transparent),
        center = glowCenter,
        radius = radius * 1.1f
    )
    val highlightBrush = Brush.radialGradient(
        colors = listOf(highlight.copy(alpha = highlightValue), Color.Transparent),
        center = highlightCenter,
        radius = radius * 0.55f
    )

    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .border(1.dp, borderColor, CircleShape)
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = pulseValue
                    scaleY = pulseValue
                }
        ) {
            drawCircle(brush = baseBrush, radius = radius, center = center)
            drawCircle(brush = coreBrush, radius = radius, center = center)
            drawCircle(brush = glowBrush, radius = radius, center = center)
            drawCircle(brush = highlightBrush, radius = radius, center = center)
            drawCircle(
                color = highlight.copy(alpha = 0.16f),
                radius = radius * 0.2f,
                center = Offset(this.size.width * 0.28f, this.size.height * 0.26f)
            )
        }
    }
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

private fun adjustHue(color: Color, hueDeg: Float): Color {
    val hueRad = hueDeg * Math.PI.toFloat() / 180f
    val cosA = cos(hueRad)
    val sinA = sin(hueRad)
    val r = color.red
    val g = color.green
    val b = color.blue
    val y = 0.299f * r + 0.587f * g + 0.114f * b
    val i = 0.596f * r - 0.274f * g - 0.322f * b
    val q = 0.211f * r - 0.523f * g + 0.312f * b
    val i2 = i * cosA - q * sinA
    val q2 = i * sinA + q * cosA
    val r2 = y + 0.956f * i2 + 0.621f * q2
    val g2 = y - 0.272f * i2 - 0.647f * q2
    val b2 = y - 1.106f * i2 + 1.703f * q2
    return Color(clamp01(r2), clamp01(g2), clamp01(b2), color.alpha)
}

private fun mix(a: Color, b: Color, t: Float): Color {
    val clamped = clamp01(t)
    return Color(
        a.red + (b.red - a.red) * clamped,
        a.green + (b.green - a.green) * clamped,
        a.blue + (b.blue - a.blue) * clamped,
        a.alpha + (b.alpha - a.alpha) * clamped
    )
}

private fun clamp01(value: Float): Float = min(1f, max(0f, value))
