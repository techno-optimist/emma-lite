package com.yourorg.emma.nativeapp.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

data class EmmaPalette(
    val id: String,
    val name: String,
    val description: String,
    val tags: List<String> = emptyList(),
    val swatches: List<Color> = emptyList(),
    val primary: Color,
    val secondary: Color,
    val surface: Color,
    val onSurface: Color,
    val backgroundColors: List<Color>,
    val cardColor: Color? = null
) {
    val background: Brush
        get() = Brush.linearGradient(backgroundColors)

    fun withBackground(colors: List<Color>): EmmaPalette = copy(backgroundColors = colors)
}

data class EmmaBackgroundOption(
    val id: String,
    val name: String,
    val description: String,
    val colors: List<Color>
)

object EmmaThemes {
    val backgrounds: List<EmmaBackgroundOption> = listOf(
        EmmaBackgroundOption(
            id = "",
            name = "Emma Adaptive",
            description = "Automatically uses the background recommended by each theme.",
            colors = listOf(Color(0xFF0BA5E9), Color(0xFF0EA5E9))
        ),
        EmmaBackgroundOption(
            id = "aurora",
            name = "Aurora Field",
            description = "Soft cosmic gradients with Emma's signature glow.",
            colors = listOf(Color(0xFF4A6DE1), Color(0xFF7A5AD2))
        ),
        EmmaBackgroundOption(
            id = "sunrise",
            name = "Sunrise Veil",
            description = "Warm morning light with gentle amber motion.",
            colors = listOf(Color(0xFFFFCBA4), Color(0xFFFF9A8B))
        ),
        EmmaBackgroundOption(
            id = "forest",
            name = "Forest Night",
            description = "Luminous particles drifting through deep forest hues.",
            colors = listOf(Color(0xFF0F2F2B), Color(0xFF1A5F5B))
        ),
        EmmaBackgroundOption(
            id = "ocean",
            name = "Lunar Tide",
            description = "Slow aurora bands drifting over deep ocean blues.",
            colors = listOf(Color(0xFF0B5E7A), Color(0xFF4DC4FF))
        ),
        EmmaBackgroundOption(
            id = "ember",
            name = "Ember Noir",
            description = "Amber sparks drifting across a noir twilight.",
            colors = listOf(Color(0xFF50232C), Color(0xFFF97316))
        ),
        EmmaBackgroundOption(
            id = "blossom",
            name = "Blossom Veil",
            description = "Soft petal diffraction floating across gentle light.",
            colors = listOf(Color(0xFFC592FF), Color(0xFFF7A8D5))
        ),
        EmmaBackgroundOption(
            id = "zen",
            name = "Zen Slate",
            description = "Holographic mist gliding over graphite horizons.",
            colors = listOf(Color(0xFF0F172A), Color(0xFF2563EB))
        )
    )

    val options: List<EmmaPalette> = listOf(
        EmmaPalette(
            id = "aurora-classic",
            name = "Aurora Classic",
            description = "Signature Emma gradient with deep cosmos ambiance.",
            tags = listOf("Animated"),
            swatches = listOf(Color(0xFF6F63D9), Color(0xFF8A6DD9), Color(0xFFCB8CC7), Color(0xFF0B0A18)),
            primary = Color(0xFF6F63D9),
            secondary = Color(0xFFD06FA8),
            surface = Color(0xFF0A0A0F),
            onSurface = Color(0xFFFFFFFF),
            backgroundColors = listOf(Color(0xFF0A0A0F), Color(0xFF1A1033), Color(0xFF0F0C29)),
            cardColor = Color(0x0CFFFFFF)
        ),
        EmmaPalette(
            id = "sunrise-glow",
            name = "Sunrise Glow",
            description = "Warm peach and coral palette with soft morning light.",
            tags = listOf("Animated"),
            swatches = listOf(Color(0xFFFF8C68), Color(0xFFFFB347), Color(0xFFFFD26F), Color(0xFFFFF6EB)),
            primary = Color(0xFFFF8C68),
            secondary = Color(0xFFFFB347),
            surface = Color(0xFFFFF6EB),
            onSurface = Color(0xFF1F1A24),
            backgroundColors = listOf(Color(0xFFFFF6EB), Color(0xFFFFE3CC), Color(0xFFFFD2B0)),
            cardColor = Color(0xD8FFFFFF)
        ),
        EmmaPalette(
            id = "midnight-forest",
            name = "Midnight Forest",
            description = "Deep greens and teals with luminous accents for focus.",
            tags = listOf("High Contrast"),
            swatches = listOf(Color(0xFF1C3D3A), Color(0xFF3AE8B3), Color(0xFF5ADEFF), Color(0xFF061B1A)),
            primary = Color(0xFF3AE8B3),
            secondary = Color(0xFF5ADEFF),
            surface = Color(0xFF061B1A),
            onSurface = Color(0xFFE9FFF9),
            backgroundColors = listOf(Color(0xFF031010), Color(0xFF0F2F2B), Color(0xFF041B19)),
            cardColor = Color(0x8C082B2B)
        ),
        EmmaPalette(
            id = "lunar-tide",
            name = "Lunar Tide",
            description = "Noctilucent blues with aqua highlights for calm focus.",
            tags = listOf("High Contrast", "Animated"),
            swatches = listOf(Color(0xFF0F3C68), Color(0xFF4DC4FF), Color(0xFF64F7D5), Color(0xFF06131F)),
            primary = Color(0xFF4DC4FF),
            secondary = Color(0xFF64F7D5),
            surface = Color(0xFF06131F),
            onSurface = Color(0xFFF0FBFF),
            backgroundColors = listOf(Color(0xFF041019), Color(0xFF0D2232), Color(0xFF032236)),
            cardColor = Color(0x8C061F2D)
        ),
        EmmaPalette(
            id = "ember-noir",
            name = "Ember Noir",
            description = "Sleek charcoal base with ember-lit highlights.",
            tags = listOf("Animated"),
            swatches = listOf(Color(0xFF2B1A1F), Color(0xFFF97316), Color(0xFFFB7185), Color(0xFF131015)),
            primary = Color(0xFFF97316),
            secondary = Color(0xFFFB7185),
            surface = Color(0xFF131015),
            onSurface = Color(0xFFFDF6F0),
            backgroundColors = listOf(Color(0xFF131015), Color(0xFF311920), Color(0xFF0C070A)),
            cardColor = Color(0x66120A0D)
        ),
        EmmaPalette(
            id = "blossom-dream",
            name = "Blossom Dream",
            description = "Pastel bloom with gentle light for uplifting moments.",
            tags = listOf("Animated"),
            swatches = listOf(Color(0xFFF7A8D5), Color(0xFFC592FF), Color(0xFFFCE1FF), Color(0xFF2C1636)),
            primary = Color(0xFFF7A8D5),
            secondary = Color(0xFFC592FF),
            surface = Color(0xFFFCEFFF),
            onSurface = Color(0xFF241121),
            backgroundColors = listOf(Color(0xFFFCEFFF), Color(0xFFF7DDF9), Color(0xFFE8C5F5)),
            cardColor = Color(0xE6FFFFFF)
        ),
        EmmaPalette(
            id = "zen-slate",
            name = "Zen Slate",
            description = "Modern graphite palette with calm blue-green accents.",
            tags = listOf("High Contrast"),
            swatches = listOf(Color(0xFF0F172A), Color(0xFF2563EB), Color(0xFF38BDF8), Color(0xFF0B1220)),
            primary = Color(0xFF2563EB),
            secondary = Color(0xFF38BDF8),
            surface = Color(0xFF0B1220),
            onSurface = Color(0xFFE5E7EB),
            backgroundColors = listOf(Color(0xFF0B1220), Color(0xFF0F172A), Color(0xFF0A1018)),
            cardColor = Color(0x332563EB)
        )
    )

    val default: EmmaPalette = options.first()

    fun byId(id: String): EmmaPalette {
        return options.firstOrNull { it.id == id } ?: default
    }

    fun backgroundColorsById(id: String?): List<Color>? {
        if (id == null || id.isEmpty()) return null
        return backgrounds.firstOrNull { it.id == id }?.colors
    }
}
