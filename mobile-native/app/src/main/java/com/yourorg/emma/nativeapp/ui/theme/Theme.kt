package com.yourorg.emma.nativeapp.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance

val LocalEmmaPalette = staticCompositionLocalOf { EmmaThemes.default }

@Composable
fun EmmaTheme(
    palette: EmmaPalette = EmmaThemes.default,
    content: @Composable () -> Unit
) {
    val isLight = palette.onSurface.luminance() < 0.5f
    val baseScheme = if (isLight) lightColorScheme() else darkColorScheme()
    val background = palette.backgroundColors.firstOrNull() ?: palette.surface
    val surface = palette.surface
    val onSurface = palette.onSurface
    val primary = palette.primary
    val secondary = palette.secondary
    val tertiary = palette.swatches.getOrNull(2) ?: secondary
    val containerBlend = if (isLight) 0.16f else 0.24f
    val primaryContainer = lerp(surface, primary, containerBlend)
    val secondaryContainer = lerp(surface, secondary, containerBlend)
    val tertiaryContainer = lerp(surface, tertiary, containerBlend)
    val surfaceVariant = lerp(surface, onSurface, if (isLight) 0.06f else 0.12f)
    val outline = onSurface.copy(alpha = if (isLight) 0.28f else 0.32f)
    val outlineVariant = onSurface.copy(alpha = if (isLight) 0.18f else 0.22f)
    val error = lerp(baseScheme.error, secondary, 0.28f)
    val errorContainer = lerp(surface, error, if (isLight) 0.18f else 0.3f)

    val colorScheme = baseScheme.copy(
        primary = primary,
        onPrimary = onSurface,
        primaryContainer = primaryContainer,
        onPrimaryContainer = onSurface,
        secondary = secondary,
        onSecondary = onSurface,
        secondaryContainer = secondaryContainer,
        onSecondaryContainer = onSurface,
        tertiary = tertiary,
        onTertiary = onSurface,
        tertiaryContainer = tertiaryContainer,
        onTertiaryContainer = onSurface,
        background = background,
        onBackground = onSurface,
        surface = surface,
        onSurface = onSurface,
        surfaceVariant = surfaceVariant,
        onSurfaceVariant = onSurface,
        outline = outline,
        outlineVariant = outlineVariant,
        surfaceTint = primary,
        error = error,
        onError = onSurface,
        errorContainer = errorContainer,
        onErrorContainer = onSurface
    )
    CompositionLocalProvider(LocalEmmaPalette provides palette) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
