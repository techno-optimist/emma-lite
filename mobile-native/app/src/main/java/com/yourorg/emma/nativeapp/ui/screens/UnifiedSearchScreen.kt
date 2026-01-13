package com.yourorg.emma.nativeapp.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.changedToUp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.buildMemorySummary
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForMemory
import java.time.Instant

@Composable
fun UnifiedSearchScreen(
    memories: List<MemoryRecord>,
    people: List<PersonRecord>,
    onBack: () -> Unit,
    onOpenPeople: (String) -> Unit,
    onOpenMemory: (String) -> Unit
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    var query by rememberSaveable { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var searchBounds by remember { mutableStateOf<Rect?>(null) }

    val tokens = remember(query) { tokenize(query) }
    val peopleById = remember(people) { people.associateBy { it.id } }
    val memorySearchIndex = remember(memories, people) {
        memories.associate { memory ->
            val peopleNames = resolvePeopleIdsForMemory(memory, people)
                .mapNotNull { id -> peopleById[id]?.name }
            memory.id to buildMemorySearchText(memory, peopleNames)
        }
    }
    val memoryPeopleLabels = remember(memories, people) {
        memories.associate { memory ->
            val resolved = resolvePeopleIdsForMemory(memory, people)
            val label = if (resolved.isNotEmpty()) {
                resolved.mapNotNull { id -> peopleById[id]?.name }.joinToString(", ")
            } else {
                memory.people.joinToString(", ")
            }
            memory.id to label
        }
    }
    val memoryMatches = remember(tokens, memories, memorySearchIndex) {
        if (tokens.isEmpty()) {
            emptyList()
        } else {
            memories
                .filter { memory ->
                    val text = memorySearchIndex[memory.id].orEmpty()
                    matchesTokens(text, tokens)
                }
                .sortedByDescending { parseMemoryInstant(it.created) }
        }
    }
    val peopleMatches = remember(tokens, people) {
        if (tokens.isEmpty()) {
            emptyList()
        } else {
            people
                .filter { person -> matchesTokens(buildPersonSearchText(person), tokens) }
                .sortedBy { it.name.lowercase() }
        }
    }
    val tagCounts = remember(memories) { buildTagCounts(memories) }
    val tagMatches = remember(tokens, tagCounts) {
        if (tokens.isEmpty()) {
            emptyList()
        } else {
            tagCounts.filter { matchesTokens(it.tagLower, tokens) }
        }
    }
    val totalMatches = memoryMatches.size + peopleMatches.size + tagMatches.size
    val subtitle = if (tokens.isEmpty()) {
        "Search memories, people, tags"
    } else {
        "${memoryMatches.size} memories, ${peopleMatches.size} people, ${tagMatches.size} tags"
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
            .statusBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SearchHeader(subtitle = subtitle, onBack = onBack)
            SearchBar(
                query = query,
                onQueryChange = { query = it },
                onInputBounds = { searchBounds = it }
            )
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (tokens.isEmpty()) {
                    item { SearchHintCard() }
                } else if (totalMatches == 0) {
                    item { EmptySearchCard(onClear = { query = "" }) }
                } else {
                    if (memoryMatches.isNotEmpty()) {
                        item { SearchSectionHeader(title = "Memories", count = memoryMatches.size) }
                        items(memoryMatches, key = { it.id }) { memory ->
                            val navigationQuery = remember(query, memory) {
                                buildMemoryNavigationQuery(memory, query)
                            }
                            MemoryResultCard(
                                memory = memory,
                                peopleLabel = memoryPeopleLabels[memory.id].orEmpty(),
                                onClick = { onOpenMemory(navigationQuery) }
                            )
                        }
                    }
                    if (peopleMatches.isNotEmpty()) {
                        item { SearchSectionHeader(title = "People", count = peopleMatches.size) }
                        items(peopleMatches, key = { it.id }) { person ->
                            PeopleResultCard(
                                person = person,
                                onClick = { onOpenPeople(person.name) }
                            )
                        }
                    }
                    if (tagMatches.isNotEmpty()) {
                        item { SearchSectionHeader(title = "Tags", count = tagMatches.size) }
                        items(tagMatches, key = { it.tag }) { tag ->
                            TagResultCard(
                                tag = tag,
                                onClick = { query = tag.tag }
                            )
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun SearchHeader(
    subtitle: String,
    onBack: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
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
                text = "Search",
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
    }
}

@Composable
private fun SearchBar(
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
        placeholder = { Text("Search memories, people, tags") },
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
private fun SearchSectionHeader(title: String, count: Int) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = colors.onSurface
        )
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.labelMedium,
            color = colors.onSurface.copy(alpha = 0.6f)
        )
    }
}

@Composable
private fun SearchHintCard() {
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
            Text("Search your vault", fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Text(
                "Start typing to find memories, people, or tags.",
                color = colors.onSurface.copy(alpha = 0.7f),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
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
            Text("No results", fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Text(
                "Try a different query or clear your search.",
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
private fun MemoryResultCard(
    memory: MemoryRecord,
    peopleLabel: String,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val snippet = remember(memory.summary, memory.body, memory.content) {
        buildMemorySnippet(memory)
    }
    val tagsLabel = remember(memory.tags) {
        memory.tags.joinToString(", ")
    }
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = memory.title.ifBlank { "Memory" },
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (snippet.isNotBlank()) {
                Text(
                    text = snippet,
                    color = colors.onSurface.copy(alpha = 0.75f),
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (peopleLabel.isNotBlank()) {
                Text(
                    text = "People: $peopleLabel",
                    color = colors.onSurface.copy(alpha = 0.65f),
                    style = MaterialTheme.typography.labelSmall
                )
            }
            if (tagsLabel.isNotBlank()) {
                Text(
                    text = "Tags: $tagsLabel",
                    color = colors.onSurface.copy(alpha = 0.65f),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
private fun PeopleResultCard(
    person: PersonRecord,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = person.name,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (person.relation.isNotBlank()) {
                    Text(
                        text = person.relation,
                        color = colors.onSurface.copy(alpha = 0.7f),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                person.contact?.takeIf { it.isNotBlank() }?.let { contact ->
                    Text(
                        text = contact,
                        color = colors.onSurface.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.KeyboardArrowRight,
                contentDescription = null,
                tint = colors.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
private fun TagResultCard(
    tag: TagCount,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.96f)),
        border = BorderStroke(1.dp, colors.outlineVariant),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        val countLabel = if (tag.count == 1) "1 memory" else "${tag.count} memories"
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = tag.tag,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            Text(
                text = countLabel,
                color = colors.onSurface.copy(alpha = 0.6f),
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

private data class TagCount(
    val tag: String,
    val count: Int,
    val tagLower: String
)

private fun tokenize(query: String): List<String> {
    return query.trim()
        .lowercase()
        .split(Regex("\\s+"))
        .filter { it.isNotBlank() }
}

private fun matchesTokens(text: String, tokens: List<String>): Boolean {
    if (tokens.isEmpty()) return false
    return tokens.all { text.contains(it) }
}

private fun buildMemorySearchText(
    memory: MemoryRecord,
    peopleNames: List<String>
): String {
    val parts = mutableListOf<String>()
    fun add(value: String?) {
        if (!value.isNullOrBlank()) parts.add(value)
    }
    add(memory.title)
    add(memory.body)
    add(memory.summary)
    add(memory.content)
    memory.tags.forEach { add(it) }
    peopleNames.forEach { add(it) }
    return parts.joinToString(" ").lowercase()
}

private fun buildPersonSearchText(person: PersonRecord): String {
    val parts = listOf(
        person.name,
        person.relation,
        person.contact ?: ""
    )
    return parts.joinToString(" ").lowercase()
}

private fun buildTagCounts(memories: List<MemoryRecord>): List<TagCount> {
    val counts = mutableMapOf<String, Int>()
    memories.forEach { memory ->
        memory.tags.map { it.trim() }.filter { it.isNotBlank() }.forEach { tag ->
            counts[tag] = (counts[tag] ?: 0) + 1
        }
    }
    return counts.entries
        .sortedWith(compareByDescending<Map.Entry<String, Int>> { it.value }.thenBy { it.key.lowercase() })
        .map { TagCount(tag = it.key, count = it.value, tagLower = it.key.lowercase()) }
}

private fun buildMemorySnippet(memory: MemoryRecord): String {
    val summary = memory.summary
        ?: buildMemorySummary(memory.body)
        ?: buildMemorySummary(memory.content.orEmpty())
    return summary ?: ""
}

private fun buildMemoryNavigationQuery(memory: MemoryRecord, fallback: String): String {
    val title = memory.title.trim()
    if (title.isNotBlank()) return title
    val snippet = buildMemorySnippet(memory).trim()
    if (snippet.isNotBlank()) return snippet.take(48)
    return fallback
}

private fun parseMemoryInstant(value: String): Long {
    return runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)
}
