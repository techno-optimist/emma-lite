package com.yourorg.emma.nativeapp.ui.screens

import android.util.Base64
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.changedToUp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourorg.emma.nativeapp.ui.components.AddMemoryOptionsDialog
import com.yourorg.emma.nativeapp.ui.components.ManualMemoryDialog
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.ui.util.toImageBitmap
import com.yourorg.emma.nativeapp.vault.MediaRecord
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun MemoryGalleryScreen(
    memories: List<MemoryRecord>,
    people: List<PersonRecord>,
    media: Map<String, MediaRecord>,
    onBack: () -> Unit,
    onCreateMemory: () -> Unit,
    onCreateMemoryManually: (String, String) -> Unit,
    initialQuery: String = "",
    memoryPreview: @Composable (MemoryRecord, onDismiss: () -> Unit, onEdit: (() -> Unit)?) -> Unit,
    onEditMemory: (MemoryRecord) -> Unit = {}
) {
    val palette = LocalEmmaPalette.current
    var searchQuery by rememberSaveable(initialQuery) { mutableStateOf(initialQuery) }
    var selectedMemory by remember { mutableStateOf<MemoryRecord?>(null) }
    var showAddMemoryDialog by rememberSaveable { mutableStateOf(false) }
    var showManualMemoryDialog by rememberSaveable { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var searchBounds by remember { mutableStateOf<Rect?>(null) }

    fun openAddMemoryDialog() {
        showAddMemoryDialog = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.background)
            .pointerInput(searchBounds) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Final)
                        val change = event.changes.firstOrNull() ?: continue
                        if (change.changedToUp()) {
                            val bounds = searchBounds
                            if (bounds == null || !bounds.contains(change.position)) {
                                focusManager.clearFocus()
                                keyboardController?.hide()
                            }
                        }
                    }
                }
            }
    ) {
        MemoryGallerySection(
            memories = memories,
            people = people,
            media = media,
            query = searchQuery,
            onQueryChange = { searchQuery = it },
            onSelectMemory = { selectedMemory = it },
            onCreateMemory = { openAddMemoryDialog() },
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            onSearchBoundsChange = { searchBounds = it },
            headerContent = { subtitle ->
                MemoryGalleryHeader(
                    subtitle = subtitle,
                    onBack = onBack,
                    onAdd = { openAddMemoryDialog() }
                )
            }
        )
    }

    selectedMemory?.let { memory ->
        memoryPreview(
            memory,
            onDismiss = { selectedMemory = null },
            onEdit = {
                onEditMemory(memory)
                selectedMemory = null
            }
        )
    }

    if (showAddMemoryDialog) {
        AddMemoryOptionsDialog(
            onDismiss = { showAddMemoryDialog = false },
            onAddViaChat = {
                showAddMemoryDialog = false
                onCreateMemory()
            },
            onAddManually = {
                showAddMemoryDialog = false
                showManualMemoryDialog = true
            }
        )
    }

    if (showManualMemoryDialog) {
        ManualMemoryDialog(
            onDismiss = { showManualMemoryDialog = false },
            onSave = { title, body ->
                onCreateMemoryManually(title, body)
                showManualMemoryDialog = false
            }
        )
    }
}

@Composable
internal fun MemoryGallerySection(
    memories: List<MemoryRecord>,
    people: List<PersonRecord>,
    media: Map<String, MediaRecord>,
    query: String,
    onQueryChange: (String) -> Unit,
    onSelectMemory: (MemoryRecord) -> Unit,
    onCreateMemory: () -> Unit,
    modifier: Modifier = Modifier,
    headerContent: (@Composable (String) -> Unit)? = null,
    showCountLabel: Boolean = false,
    contentPadding: PaddingValues = PaddingValues(bottom = 140.dp),
    onSearchBoundsChange: (Rect) -> Unit = {}
) {
    val colors = MaterialTheme.colorScheme
    val peopleLookup = remember(people) { people.associate { it.id to it.name } }
    val memoryThumbs = remember(memories, media) {
        memories.associate { mem ->
            val first = mem.attachments.firstOrNull { media.containsKey(it.id) }
            val record = first?.let { media[it.id] }
            mem.id to decodeMediaBitmap(record)
        }
    }
    val filteredMemories = remember(memories, query, peopleLookup) {
        val trimmed = query.trim()
        val base = if (trimmed.isBlank()) {
            memories
        } else {
            memories.filter { mem ->
                val peopleNames = mem.people.mapNotNull { peopleLookup[it] }
                mem.title.contains(trimmed, ignoreCase = true) ||
                    mem.body.contains(trimmed, ignoreCase = true) ||
                    mem.tags.any { it.contains(trimmed, ignoreCase = true) } ||
                    peopleNames.any { it.contains(trimmed, ignoreCase = true) }
            }
        }
        base.sortedByDescending { parseMemoryInstant(it.created) }
    }
    val countLabel = if (query.isNotBlank()) {
        "${filteredMemories.size} of ${memories.size} memories"
    } else {
        "${memories.size} memories"
    }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        headerContent?.invoke(countLabel)
        MemoryGallerySearchBar(
            query = query,
            onQueryChange = onQueryChange,
            onInputBounds = onSearchBoundsChange
        )
        if (showCountLabel && headerContent == null) {
            Text(
                text = countLabel,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurface.copy(alpha = 0.7f)
            )
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 160.dp),
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = contentPadding
        ) {
            if (filteredMemories.isEmpty()) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    EmptyMemoriesCard(onCreate = onCreateMemory)
                }
            } else {
                items(filteredMemories, key = { it.id }) { memory ->
                    MemoryGalleryCard(
                        memory = memory,
                        preview = memoryThumbs[memory.id],
                        onClick = { onSelectMemory(memory) }
                    )
                }
            }
        }
    }
}

@Composable
private fun MemoryGalleryHeader(
    subtitle: String,
    onBack: () -> Unit,
    onAdd: () -> Unit
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .size(42.dp)
                .clip(CircleShape)
                .background(
                    brush = Brush.linearGradient(
                        listOf(
                            palette.primary.copy(alpha = 0.95f),
                            palette.secondary.copy(alpha = 0.9f)
                        )
                    )
                )
        ) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = colors.onPrimary)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Memories",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurface.copy(alpha = 0.7f)
            )
        }
        Button(
            onClick = onAdd,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                contentColor = colors.onPrimary
            ),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.size(6.dp))
            Text("Add")
        }
    }
}

@Composable
private fun MemoryGallerySearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onInputBounds: (Rect) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier
            .fillMaxWidth()
            .onGloballyPositioned { coordinates ->
                onInputBounds(coordinates.boundsInRoot())
            },
        placeholder = { Text("Search memories") },
        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
        trailingIcon = {
            if (query.isNotBlank()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Close, contentDescription = "Clear")
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(16.dp),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = colors.surface,
            unfocusedContainerColor = colors.surface,
            disabledContainerColor = colors.surface
        )
    )
}

@Composable
private fun MemoryGalleryCard(
    memory: MemoryRecord,
    preview: ImageBitmap?,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val attachmentCount = memory.attachments.size
    val dateLabel = formatMemoryDate(memory.created)
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                palette.primary.copy(alpha = 0.3f),
                                palette.secondary.copy(alpha = 0.2f)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (preview != null) {
                    Image(
                        bitmap = preview,
                        contentDescription = memory.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Text(
                        text = memory.title.take(1).uppercase().ifBlank { "M" },
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        color = colors.onSurface
                    )
                }
                if (attachmentCount > 0) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(colors.surface.copy(alpha = 0.8f))
                            .border(1.dp, colors.outlineVariant, RoundedCornerShape(10.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "$attachmentCount",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.onSurface
                        )
                    }
                }
            }
            Column(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = memory.title.ifBlank { "Untitled memory" },
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = memory.body.ifBlank { "No details yet." },
                    color = colors.onSurface.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = dateLabel,
                    color = colors.onSurface.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
private fun EmptyMemoriesCard(onCreate: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("No memories yet", fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Text(
                "Capture a moment to start building your vault.",
                color = colors.onSurface.copy(alpha = 0.72f),
                style = MaterialTheme.typography.bodySmall
            )
            Button(onClick = onCreate) {
                Text("Create memory")
            }
        }
    }
}

private fun parseMemoryInstant(value: String): Long {
    return runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)
}

private fun formatMemoryDate(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("MMM d, yyyy")
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(value)
}

private fun decodeMediaBitmap(record: MediaRecord?): ImageBitmap? {
    val data = record?.data ?: return null
    return runCatching { Base64.decode(data, Base64.NO_WRAP).toImageBitmap() }.getOrNull()
}
