package com.yourorg.emma.nativeapp.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette

@Composable
fun EmmaAuroraBackground(
    modifier: Modifier = Modifier,
    accent: Color? = null
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val primary = accent ?: palette.primary
    val secondary = palette.secondary
    val highlight = colors.onBackground

    Box(modifier = modifier.background(palette.background)) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .blur(90.dp)
        ) {
            val w = size.width
            val h = size.height
            val span = maxOf(w, h)

            drawRect(
                brush = Brush.linearGradient(
                    colors = listOf(highlight.copy(alpha = 0.04f), Color.Transparent),
                    start = Offset.Zero,
                    end = Offset(x = w, y = h)
                )
            )

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(primary.copy(alpha = 0.32f), Color.Transparent),
                    center = Offset(w * 0.25f, h * 0.35f),
                    radius = span * 0.7f
                )
            )

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(secondary.copy(alpha = 0.24f), Color.Transparent),
                    center = Offset(w * 0.75f, h * 0.15f),
                    radius = span * 0.8f
                )
            )

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(highlight.copy(alpha = 0.06f), Color.Transparent),
                    center = Offset(w * 0.45f, h * 0.8f),
                    radius = span * 0.65f
                )
            )
        }
    }
}
