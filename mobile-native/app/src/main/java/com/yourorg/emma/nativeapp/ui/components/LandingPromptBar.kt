package com.yourorg.emma.nativeapp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LandingPromptBar(
    suggestions: List<String>,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    var input by remember { mutableStateOf("") }
    val savedPrompts = remember { mutableStateListOf<String>() }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Starter prompt",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = colors.onBackground
        )
        Text(
            text = "Draft a prompt for your first memory. It stays on this screen.",
            style = MaterialTheme.typography.bodySmall.copy(color = colors.onBackground.copy(alpha = 0.72f))
        )
        Surface(
            shape = RoundedCornerShape(20.dp),
            tonalElevation = 6.dp,
            shadowElevation = 8.dp,
            color = colors.surface.copy(alpha = 0.95f),
            border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.18f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TextField(
                    value = input,
                    onValueChange = { input = it },
                    placeholder = { Text("Draft your first prompt") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    )
                )
                Button(
                    onClick = {
                        val trimmed = input.trim()
                        if (trimmed.isNotEmpty() && savedPrompts.none { it.equals(trimmed, ignoreCase = true) }) {
                            savedPrompts.add(trimmed)
                        }
                        input = ""
                    },
                    enabled = input.isNotBlank(),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = palette.primary,
                        contentColor = colors.onPrimary
                    )
                ) {
                    Text("Save")
                }
            }
        }

        if (suggestions.isNotEmpty()) {
            Text(
                text = "Try a suggestion",
                style = MaterialTheme.typography.labelLarge.copy(color = colors.onBackground.copy(alpha = 0.7f))
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                suggestions.forEach { suggestion ->
                    AssistChip(
                        onClick = { input = suggestion },
                        label = { Text(suggestion) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = colors.surface,
                            labelColor = colors.onSurface
                        ),
                        border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.14f))
                    )
                }
            }
        }

        if (savedPrompts.isNotEmpty()) {
            Text(
                text = "Saved for this session",
                style = MaterialTheme.typography.labelLarge.copy(color = colors.onBackground.copy(alpha = 0.7f))
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                savedPrompts.forEach { prompt ->
                    AssistChip(
                        onClick = { input = prompt },
                        label = { Text(prompt) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = palette.primary.copy(alpha = 0.14f),
                            labelColor = colors.onSurface
                        ),
                        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.3f))
                    )
                }
            }
            Spacer(modifier = Modifier.size(4.dp))
            TextButton(onClick = { savedPrompts.clear() }) {
                Text("Clear saved prompts")
            }
        }
    }
}
