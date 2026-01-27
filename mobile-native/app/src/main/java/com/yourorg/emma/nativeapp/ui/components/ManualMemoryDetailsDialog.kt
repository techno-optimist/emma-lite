package com.yourorg.emma.nativeapp.ui.components

import android.provider.OpenableColumns
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.ui.util.toImageBitmap
import com.yourorg.emma.nativeapp.vault.MediaRecord
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.PersonRecord

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ManualMemoryDialog(
    people: List<PersonRecord>,
    media: Map<String, MediaRecord>,
    onDismiss: () -> Unit,
    onManagePeople: () -> Unit,
    onSave: (String, String, List<String>, List<MemoryAttachmentInput>, List<String>) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val context = LocalContext.current
    var title by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    var tags by remember { mutableStateOf<List<String>>(emptyList()) }
    var tagInput by rememberSaveable { mutableStateOf("") }
    var selectedPeople by remember { mutableStateOf<Set<String>>(emptySet()) }
    var newAttachments by remember { mutableStateOf<List<MemoryAttachmentInput>>(emptyList()) }
    var renameTarget by remember { mutableStateOf<AttachmentRenameTarget?>(null) }
    var renameInput by rememberSaveable { mutableStateOf("") }
    val scrollState = rememberScrollState()
    val cardSurface = colors.surface
    val headerTint = lerp(cardSurface, palette.primary, 0.16f)
    val midTint = lerp(cardSurface, palette.secondary, 0.12f)
    val iconBrush = Brush.linearGradient(listOf(palette.primary, palette.secondary))
    val cardBorder = colors.outlineVariant
    val canSave = title.isNotBlank() ||
        body.isNotBlank() ||
        tags.isNotEmpty() ||
        selectedPeople.isNotEmpty() ||
        newAttachments.isNotEmpty()
    val textFieldColors = TextFieldDefaults.colors(
        focusedContainerColor = colors.surfaceVariant,
        unfocusedContainerColor = colors.surfaceVariant,
        focusedIndicatorColor = palette.primary,
        unfocusedIndicatorColor = colors.onSurface.copy(alpha = 0.18f),
        cursorColor = palette.primary,
        focusedLabelColor = colors.onSurface.copy(alpha = 0.7f),
        unfocusedLabelColor = colors.onSurface.copy(alpha = 0.6f)
    )
    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia()
    ) { uris ->
        if (uris.isNullOrEmpty()) return@rememberLauncherForActivityResult
        val loaded = uris.mapNotNull { uri ->
            val type = context.contentResolver.getType(uri) ?: "image/*"
            val name = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                ?.use { cursor ->
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0 && cursor.moveToFirst()) cursor.getString(idx) else null
                }
                ?.takeIf { it.isNotBlank() }
                ?: "photo_${System.currentTimeMillis()}.jpg"
            val bytes = context.contentResolver.openInputStream(uri)?.use { stream -> stream.readBytes() }
            if (bytes != null) {
                MemoryAttachmentInput(name = name, mime = type, bytes = bytes)
            } else {
                Toast.makeText(context, "Unable to load selected photo", Toast.LENGTH_SHORT).show()
                null
            }
        }
        if (loaded.isNotEmpty()) {
            newAttachments = newAttachments + loaded
        }
    }
    val newPreviews = remember(newAttachments) {
        newAttachments.map { att -> att to att.bytes.toImageBitmap() }
    }
    val attachmentCount = newPreviews.size

    LaunchedEffect(renameTarget) {
        renameInput = renameTarget?.currentName.orEmpty()
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = true
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Card(
                shape = RoundedCornerShape(26.dp),
                colors = CardDefaults.cardColors(containerColor = cardSurface),
                border = BorderStroke(1.dp, cardBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 640.dp)
            ) {
                Column(
                    modifier = Modifier
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    headerTint,
                                    midTint,
                                    cardSurface
                                )
                            )
                        )
                        .padding(20.dp)
                        .verticalScroll(scrollState),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Add Memory", fontWeight = FontWeight.Bold, fontSize = 22.sp)
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(iconBrush, CircleShape)
                                .border(1.dp, colors.onPrimary.copy(alpha = 0.2f), CircleShape)
                        ) {
                            Icon(Icons.Filled.Close, contentDescription = "Close", tint = colors.onPrimary)
                        }
                    }

                    Text(
                        text = "Capture every detail now and refine later.",
                        color = colors.onSurface.copy(alpha = 0.72f),
                        style = MaterialTheme.typography.bodySmall
                    )

                    SectionLabel("Title:")
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        colors = textFieldColors,
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    SectionLabel("Content:")
                    OutlinedTextField(
                        value = body,
                        onValueChange = { body = it },
                        colors = textFieldColors,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 140.dp),
                        minLines = 5,
                        maxLines = 8
                    )

                    SectionLabel("Tags:")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = tagInput,
                            onValueChange = { tagInput = it },
                            placeholder = { Text("Add tags separated by commas") },
                            colors = textFieldColors,
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = {
                                val added = parseTags(tagInput)
                                if (added.isNotEmpty()) {
                                    tags = (tags + added)
                                        .map { it.trim() }
                                        .filter { it.isNotBlank() }
                                        .distinct()
                                }
                                tagInput = ""
                            },
                            enabled = tagInput.isNotBlank(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                        ) {
                            Text("Add")
                        }
                    }
                    if (tags.isEmpty()) {
                        Text(
                            text = "No tags yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurface.copy(alpha = 0.7f)
                        )
                    } else {
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            tags.forEach { tag ->
                                EditableTagChip(
                                    label = tag,
                                    onRemove = { tags = tags.filterNot { it == tag } }
                                )
                            }
                        }
                    }

                    SectionLabel("Who is in this memory?")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            AddPersonCard(onClick = onManagePeople)
                        }
                        items(people, key = { it.id }) { person ->
                            val avatarBitmap = remember(person.avatarId, media) {
                                person.avatarId?.let { media[it] }?.data?.let { Base64.decode(it, Base64.NO_WRAP).toImageBitmap() }
                            }
                            val selected = selectedPeople.contains(person.id)
                            SelectablePersonCard(
                                person = person,
                                avatar = avatarBitmap,
                                selected = selected,
                                onToggle = {
                                    selectedPeople = if (selected) {
                                        selectedPeople - person.id
                                    } else {
                                        selectedPeople + person.id
                                    }
                                }
                            )
                        }
                    }

                    SectionLabel("Attachments (${attachmentCount}):")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        itemsIndexed(newPreviews) { index, preview ->
                            AttachmentTile(
                                image = preview.second,
                                label = preview.first.name,
                                onRemove = {
                                    newAttachments = newAttachments.filterIndexed { i, _ -> i != index }
                                },
                                onRename = {
                                    renameTarget = AttachmentRenameTarget(preview.first.name) { newName ->
                                        newAttachments = newAttachments.mapIndexed { i, item ->
                                            if (i == index) item.copy(name = newName) else item
                                        }
                                    }
                                }
                            )
                        }
                        item {
                            AddMediaCard(
                                onClick = {
                                    photoPicker.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                }
                            )
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = {
                                onSave(
                                    title.trim(),
                                    body.trim(),
                                    selectedPeople.toList(),
                                    newAttachments,
                                    tags
                                )
                            },
                            enabled = canSave,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = palette.primary,
                                contentColor = colors.onPrimary,
                                disabledContainerColor = colors.surfaceVariant,
                                disabledContentColor = colors.onSurface.copy(alpha = 0.6f)
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Text("Save memory")
                        }
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, cardBorder),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.onSurface)
                        ) {
                            Text("Cancel")
                        }
                    }
                }
            }
        }
    }

    renameTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { renameTarget = null },
            title = { Text("Rename attachment") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = renameInput,
                        onValueChange = { renameInput = it },
                        label = { Text("Attachment name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        text = "This updates the label shown in the memory.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurface.copy(alpha = 0.7f)
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmed = renameInput.trim()
                        if (trimmed.isNotBlank()) {
                            target.onConfirm(trimmed)
                        }
                        renameTarget = null
                    },
                    enabled = renameInput.isNotBlank()
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { renameTarget = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}
@Composable
private fun SectionLabel(text: String) {
    val colors = MaterialTheme.colorScheme
    Text(
        text = text.uppercase(),
        color = colors.onSurface.copy(alpha = 0.7f),
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun AddPersonCard(onClick: () -> Unit) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val accentBorder = lerp(colors.surfaceVariant, palette.primary, 0.6f)
    val accentSurface = lerp(colors.surfaceVariant, palette.primary, 0.2f)
    Box(
        modifier = Modifier
            .size(width = 140.dp, height = 160.dp)
            .clip(RoundedCornerShape(18.dp))
            .dashedBorder(color = accentBorder, cornerRadius = 18.dp, strokeWidth = 2.dp)
            .clickable { onClick() }
            .padding(12.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(accentSurface),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add person", tint = palette.primary)
            }
            Text("Add Person", color = palette.primary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Text("Click to create", color = colors.onSurface.copy(alpha = 0.6f), fontSize = 10.sp)
        }
    }
}

@Composable
private fun SelectablePersonCard(
    person: PersonRecord,
    avatar: ImageBitmap?,
    selected: Boolean,
    onToggle: () -> Unit
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant),
        border = BorderStroke(1.dp, if (selected) palette.primary else colors.outlineVariant),
        modifier = Modifier
            .size(width = 140.dp, height = 160.dp)
            .clickable { onToggle() }
    ) {
        Box(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(20.dp)
                    .clip(CircleShape)
                    .border(1.dp, if (selected) palette.primary else colors.outlineVariant, CircleShape)
                    .background(if (selected) palette.primary else Color.Transparent),
                contentAlignment = Alignment.Center
            ) {
                if (selected) {
                    Icon(
                        Icons.Filled.Check,
                        contentDescription = null,
                        tint = colors.onPrimary,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(palette.primary, palette.secondary))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (avatar != null) {
                        Image(
                            bitmap = avatar,
                            contentDescription = person.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text(
                            text = person.name.take(2).uppercase(),
                            color = colors.onPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        person.name,
                        color = colors.onSurface,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        maxLines = 1,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        person.relation.ifBlank { "Other" },
                        color = colors.onSurface.copy(alpha = 0.7f),
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
@Composable
private fun AttachmentTile(
    image: ImageBitmap?,
    label: String,
    onRemove: () -> Unit,
    onRename: (() -> Unit)? = null
) {
    val colors = MaterialTheme.colorScheme
    val removeSurface = lerp(colors.surfaceVariant, colors.onSurface, 0.2f)
    Box(
        modifier = Modifier
            .size(96.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(colors.surfaceVariant)
            .border(1.dp, colors.outlineVariant, RoundedCornerShape(14.dp))
    ) {
        if (image != null) {
            Image(
                bitmap = image,
                contentDescription = label,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Text(
                label.take(20),
                color = colors.onSurface.copy(alpha = 0.7f),
                fontSize = 10.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp)
            )
        }
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (onRename != null) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(removeSurface)
                        .clickable { onRename() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Edit,
                        contentDescription = "Rename attachment",
                        tint = colors.onSurface,
                        modifier = Modifier.size(13.dp)
                    )
                }
            }
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(removeSurface)
                    .clickable { onRemove() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.Close,
                    contentDescription = "Remove attachment",
                    tint = colors.onSurface,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

@Composable
private fun AddMediaCard(onClick: () -> Unit) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val accentBorder = lerp(colors.surfaceVariant, palette.primary, 0.6f)
    Box(
        modifier = Modifier
            .size(96.dp)
            .clip(RoundedCornerShape(14.dp))
            .dashedBorder(color = accentBorder, cornerRadius = 14.dp, strokeWidth = 2.dp)
            .clickable { onClick() }
            .padding(8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Filled.Add, contentDescription = "Add media", tint = palette.primary)
            Text("Add media", color = colors.onSurface.copy(alpha = 0.7f), fontSize = 10.sp, textAlign = TextAlign.Center)
        }
    }
}
@Composable
private fun EditableTagChip(
    label: String,
    onRemove: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(colors.primary.copy(alpha = 0.16f))
            .border(
                BorderStroke(1.dp, palette.primary.copy(alpha = 0.28f)),
                RoundedCornerShape(12.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = label,
            color = colors.onSurface,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
        Icon(
            Icons.Filled.Close,
            contentDescription = "Remove tag",
            tint = colors.onSurface.copy(alpha = 0.7f),
            modifier = Modifier
                .size(14.dp)
                .clickable { onRemove() }
        )
    }
}

private data class AttachmentRenameTarget(
    val currentName: String,
    val onConfirm: (String) -> Unit
)

private fun parseTags(input: String): List<String> {
    return input.split(",", "\n", ";")
        .map { it.trim() }
        .filter { it.isNotBlank() }
}

private fun Modifier.dashedBorder(
    color: Color,
    cornerRadius: Dp,
    strokeWidth: Dp,
    dashLength: Dp = 6.dp,
    gapLength: Dp = 6.dp
): Modifier = drawBehind {
    val stroke = Stroke(
        width = strokeWidth.toPx(),
        pathEffect = PathEffect.dashPathEffect(
            floatArrayOf(dashLength.toPx(), gapLength.toPx()),
            0f
        )
    )
    drawRoundRect(
        color = color,
        cornerRadius = CornerRadius(cornerRadius.toPx(), cornerRadius.toPx()),
        style = stroke
    )
}
