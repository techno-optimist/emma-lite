package com.yourorg.emma.nativeapp.ui.screens

import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.ui.graphics.Brush
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.ui.util.decodeMediaMap
import com.yourorg.emma.nativeapp.ui.util.decodeMediaThumbnail
import com.yourorg.emma.nativeapp.ui.util.rememberBitmapFromUrl
import com.yourorg.emma.nativeapp.ui.util.toImageBitmap
import com.yourorg.emma.nativeapp.vault.MediaRecord
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForMemory
import com.yourorg.emma.nativeapp.vault.VaultState

@Composable
fun PeopleScreen(
    vaultState: VaultState,
    memories: List<MemoryRecord>,
    people: List<PersonRecord>,
    onUpsertPerson: (id: String?, name: String, relation: String, contact: String?, avatarData: ByteArray?, avatarMime: String?) -> Unit,
    onDeletePerson: (id: String) -> Unit,
    onNavigateDashboard: () -> Unit,
    initialQuery: String = "",
    startInAddMode: Boolean = false
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    var showEditorSheet by rememberSaveable(startInAddMode) { mutableStateOf(startInAddMode) }
    var editingPerson by remember { mutableStateOf<PersonRecord?>(null) }
    var selectedPerson by remember { mutableStateOf<PersonRecord?>(null) }
    var pendingDelete by remember { mutableStateOf<PersonRecord?>(null) }
    var searchQuery by rememberSaveable(initialQuery) { mutableStateOf(initialQuery) }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var searchBounds by remember { mutableStateOf<Rect?>(null) }

    val mediaMapRaw = vaultState.payload?.content?.media.orEmpty()
    val mediaRecords = remember(mediaMapRaw) { mediaMapRaw.decodeMediaMap() }
    val resolvedPeopleByMemoryId = remember(memories, people) {
        memories.associate { memory ->
            memory.id to resolvePeopleIdsForMemory(memory, people)
        }
    }
    val personMemories: Map<String, List<MemoryRecord>> = remember(memories, people, resolvedPeopleByMemoryId) {
        people.associate { person ->
            person.id to memories.filter { resolvedPeopleByMemoryId[it.id].orEmpty().contains(person.id) }
        }
    }
    val avatarBitmaps = remember(people, mediaRecords) {
        people.associate { person ->
            val record = person.avatarId?.let { mediaRecords[it] }
            person.id to decodeMediaThumbnail(record, maxPx = 200)
        }
    }
    val memoryPreviewBitmaps = remember(memories, people, mediaRecords, resolvedPeopleByMemoryId) {
        people.associate { person ->
            val previews = memories
                .filter { resolvedPeopleByMemoryId[it.id].orEmpty().contains(person.id) }
                .flatMap { memory ->
                    memory.attachments.mapNotNull { att ->
                        decodeMediaThumbnail(mediaRecords[att.id], maxPx = 120)
                    }
                }
                .take(3)
            person.id to previews
        }
    }
    val filteredPeople = remember(searchQuery, people) {
        val query = searchQuery.trim()
        if (query.isBlank()) {
            people
        } else {
            people.filter { person ->
                person.name.contains(query, ignoreCase = true) ||
                    person.relation.contains(query, ignoreCase = true) ||
                    (person.contact?.contains(query, ignoreCase = true) == true)
            }
        }
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
        val countLabel = if (searchQuery.isNotBlank()) {
            "${filteredPeople.size} of ${people.size} people"
        } else {
            "${people.size} people"
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            PeopleHeader(
                subtitle = countLabel,
                onBack = onNavigateDashboard,
                onAdd = {
                    editingPerson = null
                    showEditorSheet = true
                }
            )
            PeopleSearchBar(
                query = searchQuery,
                onQueryChange = { searchQuery = it },
                onInputBounds = { searchBounds = it }
            )

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 140.dp)
            ) {
                if (filteredPeople.isEmpty()) {
                    item {
                        if (searchQuery.isNotBlank()) {
                            EmptySearchCard(onClear = { searchQuery = "" })
                        } else {
                            EmptyPeopleCard(onAdd = {
                                editingPerson = null
                                showEditorSheet = true
                            })
                        }
                    }
                } else {
                    items(filteredPeople) { person ->
                        val connectedMemories = personMemories[person.id].orEmpty()
                        PersonListItem(
                            person = person,
                            memories = connectedMemories,
                            avatar = avatarBitmaps[person.id],
                            memoryPreviews = memoryPreviewBitmaps[person.id].orEmpty(),
                            onClick = { selectedPerson = person }
                        )
                    }
                }
            }
        }
    }

    if (showEditorSheet) {
        PersonEditorSheet(
            initial = editingPerson,
            media = mediaRecords,
            onDismiss = {
                showEditorSheet = false
                editingPerson = null
            },
            onConfirm = { name, relation, contact, avatarData, avatarMime ->
                onUpsertPerson(editingPerson?.id, name, relation, contact, avatarData, avatarMime)
                showEditorSheet = false
                editingPerson = null
            }
        )
    }

    selectedPerson?.let { person ->
        val connected = personMemories[person.id].orEmpty()
        PersonDetailSheet(
            person = person,
            memories = connected,
            media = mediaRecords,
            onDismiss = { selectedPerson = null },
            onEdit = {
                editingPerson = person
                showEditorSheet = true
                selectedPerson = null
            },
            onDelete = {
                pendingDelete = person
                selectedPerson = null
            }
        )
    }

    pendingDelete?.let { person ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            confirmButton = {
                Button(
                    onClick = {
                        onDeletePerson(person.id)
                        pendingDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.error,
                        contentColor = colors.onError
                    )
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
            title = { Text("Delete ${person.name}?") },
            text = { Text("Removing this person will also unlink them from memories.") }
        )
    }
}

@Composable
private fun PeopleHeader(
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
                text = "People",
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
private fun PeopleSearchBar(
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
        placeholder = { Text("Search people") },
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
private fun EmptySearchCard(onClear: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("No matches", fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Text(
                "Try a different name or clear your search.",
                color = colors.onSurface.copy(alpha = 0.7f),
                style = MaterialTheme.typography.bodySmall
            )
            TextButton(onClick = onClear) {
                Text("Clear search")
            }
        }
    }
}

@Composable
private fun EmptyPeopleCard(onAdd: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("No people yet", fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Spacer(modifier = Modifier.size(6.dp))
            Text(
                "Add someone to link memories and surface shared moments.",
                color = colors.onSurface.copy(alpha = 0.72f),
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.size(12.dp))
            Button(onClick = onAdd) { Text("Add person") }
        }
    }
}

@Composable
private fun PersonListItem(
    person: PersonRecord,
    memories: List<MemoryRecord>,
    avatar: ImageBitmap?,
    memoryPreviews: List<ImageBitmap>,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val relationStyle = relationStyle(person.relation)
    val remoteAvatar = rememberBitmapFromUrl(person.avatarUrl)
    val avatarBitmap = avatar ?: remoteAvatar
    val memoryCount = memories.size
    val memoryLabel = when (memoryCount) {
        0 -> "No memories"
        1 -> "1 memory"
        else -> "$memoryCount memories"
    }
    val subtitle = person.contact?.takeIf { it.isNotBlank() } ?: "No contact info"

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.95f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(relationStyle.avatarGradient)
                    .border(2.dp, relationStyle.avatarGradient, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (avatarBitmap != null) {
                    Image(
                        bitmap = avatarBitmap,
                        contentDescription = "${person.name} avatar",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text(
                        person.name.take(1).uppercase(),
                        fontWeight = FontWeight.Bold,
                        color = colors.onSurface
                    )
                }
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(person.name, color = colors.onSurface, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(relationStyle.chipColor)
                            .border(BorderStroke(1.dp, relationStyle.primary.copy(alpha = 0.35f)), RoundedCornerShape(10.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(person.relation.ifBlank { "other" }, color = colors.onSurface, style = MaterialTheme.typography.labelSmall)
                    }
                    Text(
                        text = subtitle,
                        color = colors.onSurface.copy(alpha = 0.7f),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = memoryLabel,
                    color = colors.onSurface.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.bodySmall
                )
                MemoryPreviewStack(previews = memoryPreviews)
                Icon(
                    Icons.Default.KeyboardArrowRight,
                    contentDescription = null,
                    tint = colors.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    }
}

@Composable
private fun MemoryPreviewStack(previews: List<ImageBitmap>) {
    if (previews.isEmpty()) return
    val colors = MaterialTheme.colorScheme
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
        previews.take(3).forEach { preview ->
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .border(1.dp, colors.surface, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    bitmap = preview,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PersonEditorSheet(
    initial: PersonRecord?,
    media: Map<String, MediaRecord>,
    onDismiss: () -> Unit,
    onConfirm: (name: String, relation: String, contact: String?, avatarData: ByteArray?, avatarMime: String?) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var name by remember(initial?.id) { mutableStateOf(initial?.name.orEmpty()) }
    var relation by remember(initial?.id) { mutableStateOf(initial?.relation ?: "other") }
    var contact by remember(initial?.id) { mutableStateOf(initial?.contact.orEmpty()) }
    var avatarData by remember(initial?.id) { mutableStateOf<ByteArray?>(null) }
    var avatarMime by remember(initial?.id) { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val initialAvatar = remember(initial?.avatarId, media) {
        initial?.avatarId?.let { media[it] }?.data?.let { Base64.decode(it, Base64.NO_WRAP).toImageBitmap() }
    }
    val avatarBitmap = avatarData?.toImageBitmap() ?: initialAvatar

    val pickImage = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            val type = context.contentResolver.getType(uri) ?: "image/*"
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            avatarData = bytes
            avatarMime = type
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.surface,
        contentColor = colors.onSurface,
        dragHandle = { SheetDragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SheetHeader(
                title = if (initial == null) "Add person" else "Edit person",
                onClose = onDismiss
            )
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceVariant)
                        .border(BorderStroke(1.dp, colors.outlineVariant), CircleShape)
                        .clickable {
                            pickImage.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (avatarBitmap != null) {
                        Image(
                            bitmap = avatarBitmap,
                            contentDescription = "Avatar",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text("Add photo", style = MaterialTheme.typography.labelSmall, color = colors.onSurface.copy(alpha = 0.8f))
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Photo", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Tap to choose an avatar.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Full name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = relation,
                onValueChange = { relation = it },
                label = { Text("Relationship") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = contact,
                onValueChange = { contact = it },
                label = { Text("Contact (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = {
                    onConfirm(name.trim(), relation.trim(), contact.trim().ifBlank { null }, avatarData, avatarMime)
                },
                enabled = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(if (initial == null) "Add person" else "Save changes")
            }
            TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                Text("Cancel")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PersonDetailSheet(
    person: PersonRecord,
    memories: List<MemoryRecord>,
    media: Map<String, MediaRecord>,
    onDismiss: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val avatarBitmap = remember(person.avatarId, media) {
        person.avatarId?.let { media[it] }?.data?.let { Base64.decode(it, Base64.NO_WRAP).toImageBitmap() }
    }
    val remoteAvatar = rememberBitmapFromUrl(person.avatarUrl)
    val image = avatarBitmap ?: remoteAvatar
    val memoryCount = memories.size

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.surface,
        contentColor = colors.onSurface,
        dragHandle = { SheetDragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SheetHeader(title = "Person details", onClose = onDismiss)
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceVariant)
                        .border(BorderStroke(1.dp, colors.outlineVariant), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (image != null) {
                        Image(
                            bitmap = image,
                            contentDescription = "Avatar",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(person.name.take(1).uppercase(), fontWeight = FontWeight.Bold)
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(person.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        person.relation.ifBlank { "other" },
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
            HorizontalDivider(color = colors.outlineVariant)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Contact", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    person.contact?.takeIf { it.isNotBlank() } ?: "No contact info",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.7f)
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Linked memories", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    if (memoryCount == 0) "No memories linked yet."
                    else "$memoryCount memories linked.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.7f)
                )
                memories.take(3).forEach { memory ->
                    Text(
                        text = memory.title.ifBlank { "Memory" },
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurface
                    )
                }
                if (memoryCount > 3) {
                    Text(
                        text = "+ ${memoryCount - 3} more",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = onEdit,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, colors.outlineVariant)
                ) {
                    Text("Edit")
                }
                Button(
                    onClick = onDelete,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.error,
                        contentColor = colors.onError
                    )
                ) {
                    Text("Delete")
                }
            }
            Spacer(modifier = Modifier.heightIn(min = 8.dp))
        }
    }
}

@Composable
private fun SheetDragHandle() {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .padding(top = 8.dp, bottom = 4.dp)
            .size(width = 36.dp, height = 4.dp)
            .clip(RoundedCornerShape(50))
            .background(colors.onSurface.copy(alpha = 0.3f))
    )
}

@Composable
private fun SheetHeader(
    title: String,
    onClose: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = colors.onSurface)
        IconButton(onClick = onClose) {
            Icon(Icons.Default.Close, contentDescription = "Close")
        }
    }
}

private data class RelationStyle(
    val primary: Color,
    val secondary: Color,
    val avatarGradient: Brush,
    val chipColor: Color
)

@Composable
private fun relationStyle(relation: String): RelationStyle {
    val palette = LocalEmmaPalette.current
    val swatches = palette.swatches.ifEmpty { listOf(palette.primary, palette.secondary) }
    fun pair(index: Int): Pair<Color, Color> {
        val first = swatches[index % swatches.size]
        val second = swatches[(index + 1) % swatches.size]
        return first to second
    }

    val (primary, secondary) = when (relation.lowercase()) {
        "family" -> pair(0)
        "friend" -> pair(1)
        "colleague" -> pair(2)
        else -> pair(0)
    }
    return RelationStyle(
        primary = primary,
        secondary = secondary,
        avatarGradient = Brush.linearGradient(listOf(primary, secondary)),
        chipColor = primary.copy(alpha = 0.18f)
    )
}
