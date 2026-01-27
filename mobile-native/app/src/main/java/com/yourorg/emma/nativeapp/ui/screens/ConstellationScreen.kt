package com.yourorg.emma.nativeapp.ui.screens

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.ElevatedAssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.consumeAllChanges
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.yourorg.emma.nativeapp.ui.constellation.ConstellationPreferences
import com.yourorg.emma.nativeapp.ui.constellation.ConstellationPreferencesState
import com.yourorg.emma.nativeapp.settings.SettingsPreferences
import com.yourorg.emma.nativeapp.settings.SettingsPreferencesState
import com.yourorg.emma.nativeapp.ui.components.AddMemoryOptionsDialog
import com.yourorg.emma.nativeapp.ui.components.ManualMemoryDialog
import com.yourorg.emma.nativeapp.ui.theme.EmmaPalette
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.ui.util.decodeMediaThumbnail
import com.yourorg.emma.nativeapp.vault.MediaRecord
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.ConstellationLayoutNode
import com.yourorg.emma.nativeapp.vault.ConstellationLayoutRecord
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForConstellation
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForMemory
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

enum class ConstellationViewMode { Constellation, Gallery }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConstellationScreen(
    memories: List<MemoryRecord>,
    people: List<PersonRecord>,
    media: Map<String, MediaRecord>,
    vaultKey: String? = null,
    vaultLayoutJson: String? = null,
    onPersistLayoutToVault: (ConstellationLayoutRecord) -> Unit = {},
    onBack: () -> Unit,
    onCreateMemory: () -> Unit,
    onCreateMemoryManually: (String, String, List<String>, List<MemoryAttachmentInput>, List<String>) -> Unit,
    memoryPreview: @Composable (MemoryRecord, onDismiss: () -> Unit, onEdit: (() -> Unit)?) -> Unit,
    onEditPerson: (PersonRecord) -> Unit = {},
    onEditMemory: (MemoryRecord) -> Unit = {},
    onManagePeople: () -> Unit = {},
    initialMode: ConstellationViewMode = ConstellationViewMode.Constellation,
    initialQuery: String = ""
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val context = LocalContext.current
    val baseNodeSize = remember(configuration.screenWidthDp) {
        when {
            configuration.screenWidthDp <= 360 -> 56.dp
            configuration.screenWidthDp <= 411 -> 64.dp
            configuration.screenWidthDp <= 520 -> 68.dp
            else -> 80.dp
        }
    }
    val personNodeSize = baseNodeSize * 1.12f
    val minScale = 0.6f
    val maxScale = 2.8f
    val json = remember { Json { ignoreUnknownKeys = true } }

    val constellationPreferences = remember { ConstellationPreferences(context.applicationContext) }
    val storedPreferences by produceState<ConstellationPreferencesState?>(initialValue = null, vaultKey) {
        constellationPreferences.state(vaultKey).collect { value = it }
    }
    val storedLayoutJson by produceState<String?>(initialValue = null, vaultKey) {
        constellationPreferences.layoutFlow(vaultKey).collect { value = it }
    }
    val settingsPreferences = remember { SettingsPreferences(context.applicationContext) }
    val settingsState by settingsPreferences.state.collectAsState(initial = SettingsPreferencesState())
    val reducedMotion = settingsState.reducedMotion

    var showMemories by rememberSaveable { mutableStateOf(true) }
    var showPeople by rememberSaveable { mutableStateOf(true) }
    var familyEnabled by rememberSaveable { mutableStateOf(true) }
    var travelEnabled by rememberSaveable { mutableStateOf(true) }
    var recentEnabled by rememberSaveable { mutableStateOf(true) }
    var specialEnabled by rememberSaveable { mutableStateOf(true) }
    var showFilters by rememberSaveable { mutableStateOf(false) }
    var showAddMemoryDialog by rememberSaveable { mutableStateOf(false) }
    var showManualMemoryDialog by rememberSaveable { mutableStateOf(false) }
    var scale by remember { mutableStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    var selectedMemory by remember { mutableStateOf<MemoryRecord?>(null) }
    var selectedPerson by remember { mutableStateOf<PersonRecord?>(null) }
    val layoutPositions = remember { mutableStateMapOf<String, Offset>() }
    var layoutRecordApplied by remember { mutableStateOf(false) }
    var layoutInitialized by remember { mutableStateOf(false) }
    var draggingNodeId by remember { mutableStateOf<String?>(null) }
    var justDraggedNodeId by remember { mutableStateOf<String?>(null) }
    var lastPersistedLayout by remember { mutableStateOf<ConstellationLayoutRecord?>(null) }
    var layoutDirtyTick by remember { mutableStateOf(0) }
    var transformTick by remember { mutableStateOf(0) }
    var isTransforming by remember { mutableStateOf(false) }
    val resolvedInitialMode = if (initialMode == ConstellationViewMode.Constellation && initialQuery.isNotBlank()) {
        ConstellationViewMode.Gallery
    } else {
        initialMode
    }
    var viewMode by rememberSaveable(resolvedInitialMode) { mutableStateOf(resolvedInitialMode) }
    var galleryQuery by rememberSaveable(initialQuery) { mutableStateOf(initialQuery) }
    val isGallery = viewMode == ConstellationViewMode.Gallery

    val vaultLayoutRecord = remember(vaultLayoutJson, json) { parseLayoutJson(vaultLayoutJson, json) }
    val preferencesLayoutRecord = remember(storedLayoutJson, json) { parseLayoutJson(storedLayoutJson, json) }
    val activeLayoutRecord = remember(vaultLayoutRecord, preferencesLayoutRecord) {
        selectLatestLayout(preferencesLayoutRecord, vaultLayoutRecord)
    }
    val persistLayoutToVault by rememberUpdatedState(onPersistLayoutToVault)

    fun markLayoutDirty() {
        layoutDirtyTick += 1
    }

    fun openAddMemoryDialog() {
        showAddMemoryDialog = true
    }

    fun applyPanZoom(pan: Offset, zoomChange: Float, pivot: Offset) {
        val previousScale = scale
        val targetScale = (scale * zoomChange).coerceIn(minScale, maxScale)
        val appliedZoom = if (previousScale == 0f) 1f else targetScale / previousScale
        scale = targetScale
        offset = (offset + pan - pivot) * appliedZoom + pivot
        markLayoutDirty()
    }

    fun applyZoomBy(factor: Float, pivot: Offset) {
        val previousScale = scale
        val targetScale = (scale * factor).coerceIn(minScale, maxScale)
        val appliedZoom = if (previousScale == 0f) 1f else targetScale / previousScale
        scale = targetScale
        offset = (offset - pivot) * appliedZoom + pivot
        markLayoutDirty()
    }

    fun fitToNodes(nodeIds: Set<String>) {
        if (canvasSize.width == 0 || canvasSize.height == 0) return
        val positions = nodeIds.mapNotNull { layoutPositions[it] }
        if (positions.isEmpty()) {
            scale = 1f
            offset = Offset.Zero
            markLayoutDirty()
            return
        }
        val padding = with(density) { (personNodeSize * 1.1f).toPx() }
        var minX = Float.POSITIVE_INFINITY
        var minY = Float.POSITIVE_INFINITY
        var maxX = Float.NEGATIVE_INFINITY
        var maxY = Float.NEGATIVE_INFINITY
        positions.forEach { pos ->
            minX = min(minX, pos.x - padding)
            minY = min(minY, pos.y - padding)
            maxX = kotlin.math.max(maxX, pos.x + padding)
            maxY = kotlin.math.max(maxY, pos.y + padding)
        }
        val contentWidth = (maxX - minX).coerceAtLeast(1f)
        val contentHeight = (maxY - minY).coerceAtLeast(1f)
        val scaleX = (canvasSize.width * 0.86f) / contentWidth
        val scaleY = (canvasSize.height * 0.86f) / contentHeight
        val targetScale = min(scaleX, scaleY).coerceIn(minScale, maxScale)
        val centerX = (minX + maxX) / 2f
        val centerY = (minY + maxY) / 2f
        val screenCenter = Offset(canvasSize.width / 2f, canvasSize.height / 2f)
        scale = targetScale
        offset = Offset(
            x = screenCenter.x - centerX * targetScale,
            y = screenCenter.y - centerY * targetScale
        )
        markLayoutDirty()
    }

    LaunchedEffect(vaultKey) {
        layoutPositions.clear()
        layoutRecordApplied = false
        layoutInitialized = false
        draggingNodeId = null
        justDraggedNodeId = null
        lastPersistedLayout = null
        layoutDirtyTick = 0
        transformTick = 0
        isTransforming = false
    }

    LaunchedEffect(transformTick) {
        if (transformTick == 0) return@LaunchedEffect
        isTransforming = true
        delay(120)
        isTransforming = false
    }

    LaunchedEffect(justDraggedNodeId) {
        if (justDraggedNodeId == null) return@LaunchedEffect
        delay(160)
        justDraggedNodeId = null
    }

    LaunchedEffect(storedPreferences, layoutRecordApplied) {
        val prefs = storedPreferences ?: return@LaunchedEffect
        showMemories = prefs.showMemories
        showPeople = prefs.showPeople
        familyEnabled = prefs.familyEnabled
        travelEnabled = prefs.travelEnabled
        recentEnabled = prefs.recentEnabled
        specialEnabled = prefs.specialEnabled
        if (!layoutRecordApplied) {
            scale = prefs.scale.coerceIn(minScale, maxScale)
            offset = Offset(prefs.offsetX, prefs.offsetY)
        }
    }

    LaunchedEffect(storedPreferences != null, vaultKey) {
        if (storedPreferences == null) return@LaunchedEffect
        snapshotFlow {
            ConstellationPreferencesState(
                showMemories = showMemories,
                showPeople = showPeople,
                familyEnabled = familyEnabled,
                travelEnabled = travelEnabled,
                recentEnabled = recentEnabled,
                specialEnabled = specialEnabled,
                scale = scale.coerceIn(minScale, maxScale),
                offsetX = offset.x,
                offsetY = offset.y
            )
        }
            .distinctUntilChanged()
            .debounce(300)
            .collect { constellationPreferences.save(it, vaultKey) }
    }

    LaunchedEffect(viewMode) {
        if (viewMode == ConstellationViewMode.Gallery && showFilters) {
            showFilters = false
        }
    }

    val memoryThumbs = remember(memories, media) {
        memories.associate { mem ->
            val first = mem.attachments.firstOrNull { media.containsKey(it.id) }
            val record = first?.let { media[it.id] }
            mem.id to decodeMediaThumbnail(record, maxPx = 220)
        }
    }
    val avatarBitmaps = remember(people, media) {
        people.associate { person ->
            val record = person.avatarId?.let { media[it] }
            person.id to decodeMediaThumbnail(record, maxPx = 240)
        }
    }
    val explicitPeopleByMemoryId = remember(memories, people) {
        memories.associate { memory ->
            memory.id to resolvePeopleIdsForMemory(memory, people)
        }
    }
    val constellationPeopleByMemoryId = remember(memories, people) {
        memories.associate { memory ->
            memory.id to resolvePeopleIdsForConstellation(memory, people)
        }
    }
    val constellationLinks = remember(constellationPeopleByMemoryId) {
        buildList {
            constellationPeopleByMemoryId.forEach { (memoryId, peopleIds) ->
                peopleIds.forEach { personId -> add(memoryId to personId) }
            }
        }
    }
    val memoryCount = memories.size
    val peopleCount = people.size
    val themeCounts = remember(memories) {
        val counts = mutableMapOf("family" to 0, "travel" to 0, "recent" to 0, "special" to 0)
        memories.forEach { mem ->
            val theme = mem.theme?.lowercase()?.ifBlank { "family" } ?: "family"
            if (theme in counts) {
                counts[theme] = counts.getValue(theme) + 1
            }
        }
        counts
    }
    val familyCount = themeCounts["family"] ?: 0
    val travelCount = themeCounts["travel"] ?: 0
    val recentCount = themeCounts["recent"] ?: 0
    val specialCount = themeCounts["special"] ?: 0

    val allNodes = remember(memories, people, memoryThumbs, avatarBitmaps) {
        buildList {
            memories.forEachIndexed { index, mem ->
                add(
                    ConstellationNode(
                        id = mem.id,
                        label = mem.title.ifBlank { "Memory" },
                        type = ConstellationNodeType.Memory,
                        theme = mem.theme ?: "family",
                        image = memoryThumbs[mem.id],
                        order = index
                    )
                )
            }
            people.forEachIndexed { idx, person ->
                add(
                    ConstellationNode(
                        id = person.id,
                        label = person.name,
                        type = ConstellationNodeType.Person,
                        theme = person.relation.ifBlank { "other" },
                        image = avatarBitmaps[person.id],
                        order = memories.size + idx
                    )
                )
            }
        }
    }
    val visibleNodes = remember(allNodes, showMemories, showPeople, familyEnabled, travelEnabled, recentEnabled, specialEnabled) {
        allNodes.filter { node ->
            when (node.type) {
                ConstellationNodeType.Memory -> {
                    showMemories && themeEnabled(node.theme, familyEnabled, travelEnabled, recentEnabled, specialEnabled)
                }
                ConstellationNodeType.Person -> showPeople
            }
        }
    }
    val allNodeIds = remember(allNodes) { allNodes.map { it.id }.toSet() }
    val visibleNodeIds = remember(visibleNodes) { visibleNodes.map { it.id }.toSet() }

    LaunchedEffect(activeLayoutRecord, canvasSize, allNodes, vaultKey) {
        if (canvasSize.width == 0 || canvasSize.height == 0) return@LaunchedEffect
        val nodeIdSet = allNodeIds
        var layoutChanged = false

        if (!layoutRecordApplied && activeLayoutRecord != null) {
            val applied = applyLayoutRecord(activeLayoutRecord, canvasSize, layoutPositions, nodeIdSet, minScale, maxScale)
            scale = applied.scale
            offset = applied.offset
            layoutRecordApplied = true
        }

        val defaults = computeDefaultNodePositions(allNodes, canvasSize)
        nodeIdSet.forEach { nodeId ->
            if (!layoutPositions.containsKey(nodeId)) {
                defaults[nodeId]?.let { layoutPositions[nodeId] = it }
                layoutChanged = true
            }
        }

        val staleIds = layoutPositions.keys.toSet() - nodeIdSet
        if (staleIds.isNotEmpty()) {
            staleIds.forEach { layoutPositions.remove(it) }
            layoutChanged = true
        }
        layoutInitialized = layoutPositions.isNotEmpty()
        if (layoutChanged) {
            markLayoutDirty()
        }
    }

    LaunchedEffect(layoutInitialized, canvasSize, vaultKey) {
        if (!layoutInitialized) return@LaunchedEffect
        if (canvasSize.width == 0 || canvasSize.height == 0) return@LaunchedEffect
        snapshotFlow { layoutDirtyTick }
            .distinctUntilChanged()
            .debounce(320)
            .collect { tick ->
                if (tick == 0) return@collect
                val record = buildLayoutRecordSnapshot(
                    positions = layoutPositions,
                    canvasSize = canvasSize,
                    scale = scale.coerceIn(minScale, maxScale),
                    offset = offset
                )
                if (lastPersistedLayout == record) return@collect
                lastPersistedLayout = record
                val now = System.currentTimeMillis()
                val stamped = record.copy(savedAt = now)
                val payload = json.encodeToString(stamped)
                constellationPreferences.saveLayout(payload, vaultKey)
                persistLayoutToVault(stamped)
            }
    }

    val interactionActive = draggingNodeId != null || isTransforming
    val pulsesEnabled = !reducedMotion && !interactionActive
    val (nodePulse, addPulse) = if (pulsesEnabled) {
        val pulseTransition = rememberInfiniteTransition(label = "constellationPulse")
        val nodePulseAnimated by pulseTransition.animateFloat(
            initialValue = 0.92f,
            targetValue = 1.08f,
            animationSpec = infiniteRepeatable(animation = tween(1400), repeatMode = RepeatMode.Reverse),
            label = "nodePulse"
        )
        val addPulseAnimated by pulseTransition.animateFloat(
            initialValue = 0.94f,
            targetValue = 1.06f,
            animationSpec = infiniteRepeatable(animation = tween(1200), repeatMode = RepeatMode.Reverse),
            label = "addPulse"
        )
        nodePulseAnimated to addPulseAnimated
    } else {
        1f to 1f
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.background)
    ) {
        ConstellationHeader(
            mode = viewMode,
            onModeChange = { mode ->
                viewMode = mode
                if (mode == ConstellationViewMode.Gallery) {
                    showFilters = false
                }
            },
            onBack = onBack,
            showFilters = showFilters,
            onToggleFilters = { showFilters = !showFilters },
            onCreateMemory = { openAddMemoryDialog() }
        )

        if (isGallery) {
            MemoryGallerySection(
                memories = memories,
                people = people,
                media = media,
                query = galleryQuery,
                onQueryChange = { galleryQuery = it },
                onSelectMemory = { selectedMemory = it },
                onCreateMemory = { openAddMemoryDialog() },
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                showCountLabel = true
            )
        } else {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                val constellationLayerModifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        translationX = offset.x
                        translationY = offset.y
                        scaleX = scale
                        scaleY = scale
                        transformOrigin = TransformOrigin(0f, 0f)
                    }

                Box(modifier = constellationLayerModifier) {
                    Canvas(
                        modifier = Modifier
                            .fillMaxSize()
                            .pointerInput(visibleNodes, draggingNodeId) {
                                detectTransformGestures { centroid, pan, zoom, _ ->
                                    if (draggingNodeId != null) return@detectTransformGestures
                                    if (pan == Offset.Zero && zoom == 1f) return@detectTransformGestures
                                    transformTick += 1
                                    val safeScale = if (scale == 0f) 1f else scale
                                    val centroidScreen = stageToScreen(centroid, safeScale, offset)
                                    val panScreen = Offset(pan.x * safeScale, pan.y * safeScale)
                                    applyPanZoom(panScreen, zoom, centroidScreen)
                                }
                            }
                    ) {
                        canvasSize = IntSize(size.width.roundToInt(), size.height.roundToInt())

                        constellationLinks.forEach { (memoryId, personId) ->
                            if (!visibleNodeIds.contains(memoryId) || !visibleNodeIds.contains(personId)) return@forEach
                            val memStage = layoutPositions[memoryId] ?: return@forEach
                            val personStage = layoutPositions[personId] ?: return@forEach
                            drawLine(
                                color = colors.secondary.copy(alpha = 0.28f),
                                start = memStage,
                                end = personStage,
                                strokeWidth = 3f,
                                alpha = 0.85f
                            )
                        }
                    }

                    visibleNodes.forEach { node ->
                        val nodeStage = layoutPositions[node.id] ?: return@forEach
                        val nodeStyle = styleFor(node, palette)
                        val baseSizeDp = if (node.type == ConstellationNodeType.Person) personNodeSize else baseNodeSize
                        val bubbleSize = baseSizeDp * nodePulse
                        val radiusPx = with(density) { bubbleSize.toPx() / 2f }
                        val offsetModifier = Modifier.offset {
                            androidx.compose.ui.unit.IntOffset(
                                (nodeStage.x - radiusPx).roundToInt(),
                                (nodeStage.y - radiusPx).roundToInt()
                            )
                        }
                        val dragModifier = Modifier.pointerInput(node.id) {
                            detectDragGesturesAfterLongPress(
                                onDragStart = { draggingNodeId = node.id },
                                onDragEnd = {
                                    draggingNodeId = null
                                    justDraggedNodeId = node.id
                                },
                                onDragCancel = { draggingNodeId = null },
                                onDrag = { change, dragAmount ->
                                    change.consumeAllChanges()
                                    val current = layoutPositions[node.id] ?: return@detectDragGesturesAfterLongPress
                                    layoutPositions[node.id] = current + dragAmount
                                    markLayoutDirty()
                                }
                            )
                        }
                        val clickAllowed = justDraggedNodeId != node.id && draggingNodeId == null

                        ConstellationNodeBubble(
                            modifier = offsetModifier.then(dragModifier),
                            label = node.label,
                            image = node.image,
                            style = nodeStyle,
                            size = bubbleSize
                        ) {
                            if (!clickAllowed) return@ConstellationNodeBubble
                            if (node.type == ConstellationNodeType.Memory) {
                                memories.firstOrNull { it.id == node.id }?.let { selectedMemory = it }
                            } else {
                                people.firstOrNull { it.id == node.id }?.let { selectedPerson = it }
                            }
                        }
                    }
                }

                val filterModifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 16.dp, end = 16.dp)
                val filterCard: @Composable () -> Unit = {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = colors.surface.copy(alpha = 0.9f),
                            contentColor = colors.onSurface
                        ),
                        shape = RoundedCornerShape(18.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Default.FilterList, contentDescription = null, tint = colors.primary)
                                Text("Filters", fontWeight = FontWeight.Bold)
                            }
                            ConstellationFilterChip(label = "Memories ($memoryCount)", checked = showMemories) { showMemories = it }
                            ConstellationFilterChip(label = "People ($peopleCount)", checked = showPeople) { showPeople = it }
                            androidx.compose.material3.HorizontalDivider(color = colors.outline.copy(alpha = 0.4f))
                            Text("Themes", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ElevatedAssistChip(
                                    onClick = { familyEnabled = !familyEnabled },
                                    label = { Text("Family ($familyCount)") },
                                    leadingIcon = { Dot(styleForTheme("family", palette).primary) },
                                    colors = assistChipColors(familyEnabled, colors)
                                )
                                ElevatedAssistChip(
                                    onClick = { travelEnabled = !travelEnabled },
                                    label = { Text("Travel ($travelCount)") },
                                    leadingIcon = { Dot(styleForTheme("travel", palette).primary) },
                                    colors = assistChipColors(travelEnabled, colors)
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ElevatedAssistChip(
                                    onClick = { recentEnabled = !recentEnabled },
                                    label = { Text("Recent ($recentCount)") },
                                    leadingIcon = { Dot(styleForTheme("recent", palette).primary) },
                                    colors = assistChipColors(recentEnabled, colors)
                                )
                                ElevatedAssistChip(
                                    onClick = { specialEnabled = !specialEnabled },
                                    label = { Text("Special ($specialCount)") },
                                    leadingIcon = { Dot(styleForTheme("special", palette).primary) },
                                    colors = assistChipColors(specialEnabled, colors)
                                )
                            }
                            Text(
                                "Pinch to zoom, drag to pan, use controls to zoom/reset.",
                                color = colors.onSurface.copy(alpha = 0.7f),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

                if (reducedMotion) {
                    if (showFilters) {
                        Box(modifier = filterModifier) { filterCard() }
                    }
                } else {
                    androidx.compose.animation.AnimatedVisibility(
                        visible = showFilters,
                        modifier = filterModifier
                    ) {
                        filterCard()
                    }
                }

                Column(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    val canvasCenter = Offset(canvasSize.width / 2f, canvasSize.height / 2f)
                    RoundIconButton(icon = Icons.Default.Add) { applyZoomBy(1.12f, canvasCenter) }
                    RoundIconButton(icon = Icons.Default.Remove) { applyZoomBy(1f / 1.12f, canvasCenter) }
                    RoundIconButton(icon = Icons.Default.Refresh) { fitToNodes(visibleNodeIds) }
                }

                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 22.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(baseNodeSize * 1.2f * addPulse)
                            .clip(CircleShape)
                            .background(colors.primary)
                            .border(1.dp, colors.onPrimary.copy(alpha = 0.2f), CircleShape)
                            .clickable { openAddMemoryDialog() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Add memory",
                            tint = colors.onPrimary,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }
    }

    selectedMemory?.let { mem ->
        memoryPreview(mem, onDismiss = { selectedMemory = null }, onEdit = { onEditMemory(mem) })
    }
    selectedPerson?.let { person ->
        PersonNodeDialog(
            person = person,
            memories = memories.filter { explicitPeopleByMemoryId[it.id].orEmpty().contains(person.id) },
            media = media,
            onDismiss = { selectedPerson = null },
            onEditPerson = {
                onEditPerson(person)
                selectedPerson = null
            },
            onAddMemory = {
                selectedPerson = null
                openAddMemoryDialog()
            },
            onManagePeople = {
                onManagePeople()
                selectedPerson = null
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
            people = people,
            media = media,
            onDismiss = { showManualMemoryDialog = false },
            onManagePeople = {
                showManualMemoryDialog = false
                onManagePeople()
            },
            onSave = { title, body, selectedPeople, attachments, tags ->
                onCreateMemoryManually(title, body, selectedPeople, attachments, tags)
                showManualMemoryDialog = false
            }
        )
    }
}

@Composable
private fun ConstellationHeader(
    mode: ConstellationViewMode,
    onModeChange: (ConstellationViewMode) -> Unit,
    onBack: () -> Unit,
    showFilters: Boolean,
    onToggleFilters: () -> Unit,
    onCreateMemory: () -> Unit
) {
    val actionIcon = if (mode == ConstellationViewMode.Gallery) {
        Icons.Default.Add
    } else {
        if (showFilters) Icons.Filled.Close else Icons.Default.FilterList
    }
    val actionClick = if (mode == ConstellationViewMode.Gallery) onCreateMemory else onToggleFilters

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp)
    ) {
        RoundIconButton(
            icon = Icons.AutoMirrored.Filled.ArrowBack,
            onClick = onBack,
            modifier = Modifier.align(Alignment.CenterStart)
        )
        ConstellationModeToggle(
            mode = mode,
            onModeChange = onModeChange,
            modifier = Modifier.align(Alignment.Center)
        )
        RoundIconButton(
            icon = actionIcon,
            onClick = actionClick,
            modifier = Modifier.align(Alignment.CenterEnd)
        )
    }
}

@Composable
private fun ConstellationModeToggle(
    mode: ConstellationViewMode,
    onModeChange: (ConstellationViewMode) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(20.dp)
    Row(
        modifier = modifier
            .clip(shape)
            .background(colors.surface.copy(alpha = 0.92f))
            .border(1.dp, colors.outlineVariant, shape)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ConstellationModeToggleButton(
            label = "Constellation",
            selected = mode == ConstellationViewMode.Constellation,
            onClick = { onModeChange(ConstellationViewMode.Constellation) }
        )
        ConstellationModeToggleButton(
            label = "Gallery",
            selected = mode == ConstellationViewMode.Gallery,
            onClick = { onModeChange(ConstellationViewMode.Gallery) }
        )
    }
}

@Composable
private fun ConstellationModeToggleButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(14.dp)
    val backgroundModifier = if (selected) {
        Modifier.background(
            brush = Brush.horizontalGradient(listOf(palette.primary, palette.secondary)),
            shape = shape
        )
    } else {
        Modifier.background(
            color = colors.surfaceVariant.copy(alpha = 0.6f),
            shape = shape
        )
    }
    Box(
        modifier = Modifier
            .clip(shape)
            .then(backgroundModifier)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (selected) colors.onPrimary else colors.onSurface.copy(alpha = 0.8f),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun RoundIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(
                Brush.linearGradient(
                    listOf(
                        palette.primary.copy(alpha = 0.95f),
                        palette.secondary.copy(alpha = 0.9f)
                    )
                )
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = colors.onPrimary)
    }
}

@Composable
private fun ConstellationNodeBubble(
    modifier: Modifier,
    label: String,
    image: ImageBitmap?,
    style: ConstellationNodeStyle,
    size: androidx.compose.ui.unit.Dp,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = modifier.width(size),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(size)
                .clip(CircleShape)
                .background(colors.surface.copy(alpha = 0.95f))
                .border(
                    width = 2.dp,
                    color = style.primary.copy(alpha = 0.6f),
                    shape = CircleShape
                )
                .clickable { onClick() },
            contentAlignment = Alignment.Center
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
                    text = label.take(1).uppercase(),
                    color = colors.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
        }
        Spacer(modifier = Modifier.size(6.dp))
        Text(
            text = label.take(18),
            color = colors.onSurface.copy(alpha = 0.9f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun ConstellationFilterChip(label: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (checked) colors.primary.copy(alpha = 0.18f)
                else colors.surfaceVariant.copy(alpha = 0.5f)
            )
            .clickable { onChecked(!checked) }
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(if (checked) colors.primary else colors.onSurface.copy(alpha = 0.4f))
        )
        Spacer(modifier = Modifier.size(8.dp))
        Text(label, color = colors.onSurface, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun Dot(color: Color) {
    Box(
        modifier = Modifier
            .size(10.dp)
            .clip(CircleShape)
            .background(color)
    )
}

@Composable
private fun assistChipColors(enabled: Boolean, colors: ColorScheme) =
    AssistChipDefaults.assistChipColors(
        containerColor = if (enabled) colors.primary.copy(alpha = 0.16f)
        else colors.surfaceVariant.copy(alpha = 0.5f),
        labelColor = colors.onSurface,
        leadingIconContentColor = colors.onSurface
    )

private data class ConstellationNode(
    val id: String,
    val label: String,
    val type: ConstellationNodeType,
    val theme: String,
    val image: ImageBitmap?,
    val order: Int
)

private enum class ConstellationNodeType { Memory, Person }

private data class ConstellationNodeStyle(val primary: Color, val secondary: Color, val glow: Color)

private data class AppliedLayout(val scale: Float, val offset: Offset)

private fun styleForTheme(theme: String, palette: EmmaPalette): ConstellationNodeStyle {
    val swatches = palette.swatches.ifEmpty { listOf(palette.primary, palette.secondary) }
    fun pair(index: Int): Pair<Color, Color> {
        val first = swatches[index % swatches.size]
        val second = swatches[(index + 1) % swatches.size]
        return first to second
    }

    val (primary, secondary) = when (theme.lowercase()) {
        "family" -> pair(0)
        "travel" -> pair(1)
        "recent" -> pair(2)
        "special" -> pair(3)
        "friend" -> pair(1)
        "colleague" -> pair(2)
        else -> pair(0)
    }
    return ConstellationNodeStyle(
        primary = primary,
        secondary = secondary,
        glow = primary.copy(alpha = 0.35f)
    )
}

private fun styleFor(node: ConstellationNode, palette: EmmaPalette): ConstellationNodeStyle =
    styleForTheme(node.theme, palette)

private fun computeDefaultNodePositions(
    nodes: List<ConstellationNode>,
    size: IntSize
): Map<String, Offset> {
    if (nodes.isEmpty() || size.width == 0 || size.height == 0) return emptyMap()
    val center = Offset(size.width / 2f, size.height / 2f)
    val minDim = min(size.width, size.height).toFloat()
    val baseRadius = minDim / 3f
    return nodes.associate { node ->
        val random = Random(node.id.hashCode())
        val baseAngle = (node.order.toFloat() / nodes.size.coerceAtLeast(1)) * 2f * PI.toFloat()
        val angle = baseAngle + (random.nextFloat() - 0.5f) * 0.8f
        val radius = baseRadius * (0.72f + random.nextFloat() * 0.4f)
        val pos = Offset(
            x = center.x + radius * cos(angle),
            y = center.y + radius * sin(angle)
        )
        node.id to pos
    }
}

private fun stageToScreen(position: Offset, scale: Float, offset: Offset): Offset {
    return Offset(
        x = position.x * scale + offset.x,
        y = position.y * scale + offset.y
    )
}

private fun buildLayoutRecordSnapshot(
    positions: Map<String, Offset>,
    canvasSize: IntSize,
    scale: Float,
    offset: Offset
): ConstellationLayoutRecord {
    val width = canvasSize.width.coerceAtLeast(1)
    val height = canvasSize.height.coerceAtLeast(1)
    val widthF = width.toFloat()
    val heightF = height.toFloat()
    val nodes = positions.mapValues { (_, position) ->
        ConstellationLayoutNode(
            xRatio = position.x / widthF,
            yRatio = position.y / heightF
        )
    }
    return ConstellationLayoutRecord(
        version = 1,
        savedAt = 0L,
        viewportWidth = width,
        viewportHeight = height,
        scale = scale,
        offsetX = offset.x,
        offsetY = offset.y,
        nodes = nodes
    )
}

private fun applyLayoutRecord(
    record: ConstellationLayoutRecord,
    canvasSize: IntSize,
    positions: MutableMap<String, Offset>,
    nodeIds: Set<String>,
    minScale: Float,
    maxScale: Float
): AppliedLayout {
    val width = canvasSize.width.coerceAtLeast(1)
    val height = canvasSize.height.coerceAtLeast(1)
    val savedWidth = record.viewportWidth.takeIf { it > 0 } ?: width
    val savedHeight = record.viewportHeight.takeIf { it > 0 } ?: height
    val widthRatio = width.toFloat() / savedWidth.toFloat()
    val heightRatio = height.toFloat() / savedHeight.toFloat()
    record.nodes.forEach { (nodeId, node) ->
        if (!nodeIds.contains(nodeId)) return@forEach
        positions[nodeId] = Offset(node.xRatio * width.toFloat(), node.yRatio * height.toFloat())
    }
    return AppliedLayout(
        scale = record.scale.coerceIn(minScale, maxScale),
        offset = Offset(
            x = record.offsetX * widthRatio,
            y = record.offsetY * heightRatio
        )
    )
}

private fun parseLayoutJson(raw: String?, json: Json): ConstellationLayoutRecord? {
    if (raw.isNullOrBlank()) return null
    return runCatching { json.decodeFromString<ConstellationLayoutRecord>(raw) }.getOrNull()
}

private fun selectLatestLayout(
    localLayout: ConstellationLayoutRecord?,
    vaultLayout: ConstellationLayoutRecord?
): ConstellationLayoutRecord? {
    if (localLayout == null) return vaultLayout
    if (vaultLayout == null) return localLayout
    return if (localLayout.savedAt >= vaultLayout.savedAt) localLayout else vaultLayout
}

private fun themeEnabled(
    theme: String,
    family: Boolean,
    travel: Boolean,
    recent: Boolean,
    special: Boolean
): Boolean {
    return when (theme.lowercase()) {
        "family" -> family
        "travel" -> travel
        "recent" -> recent
        "special" -> special
        else -> true
    }
}

@Composable
private fun PersonNodeDialog(
    person: PersonRecord,
    memories: List<MemoryRecord>,
    media: Map<String, MediaRecord>,
    onDismiss: () -> Unit,
    onEditPerson: () -> Unit,
    onAddMemory: () -> Unit,
    onManagePeople: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val avatarBitmap = person.avatarId?.let { media[it] }?.let { decodeMediaThumbnail(it, maxPx = 320) }
    val scrollState = rememberScrollState()
    val cardSurface = colors.surface
    val headerTint = lerp(cardSurface, palette.primary, 0.16f)
    val midTint = lerp(cardSurface, palette.secondary, 0.12f)
    val iconBrush = Brush.linearGradient(listOf(palette.primary, palette.secondary))
    val cardBorder = colors.outlineVariant

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
                colors = CardDefaults.cardColors(
                    containerColor = cardSurface,
                    contentColor = colors.onSurface
                ),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, cardBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
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
                        Text(person.name, fontWeight = FontWeight.Bold, fontSize = 22.sp)
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

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(92.dp)
                                .clip(CircleShape)
                                .border(
                                    2.dp,
                                    Brush.linearGradient(listOf(colors.secondary, colors.primary)),
                                    CircleShape
                                )
                        ) {
                            if (avatarBitmap != null) {
                                Image(
                                    bitmap = avatarBitmap,
                                    contentDescription = "Avatar",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Text(
                                    person.name.take(1).uppercase(),
                                    color = colors.onSurface,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.align(Alignment.Center)
                                )
                            }
                        }

                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                person.relation.ifBlank { "No relation set" },
                                color = colors.onSurface.copy(alpha = 0.8f),
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                person.contact?.takeIf { it.isNotBlank() } ?: "No contact info",
                                color = colors.onSurface.copy(alpha = 0.7f)
                            )
                        }
                    }

                    androidx.compose.material3.HorizontalDivider(color = colors.onSurface.copy(alpha = 0.14f))

                    DialogSectionLabel("Connected Memories")
                    if (memories.isEmpty()) {
                        Text("No connected memories yet", color = colors.onSurface.copy(alpha = 0.7f))
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            memories.take(4).forEachIndexed { index, mem ->
                                Text(
                                    "${index + 1}. ${mem.title.take(48)}",
                                    color = colors.onSurface,
                                    textAlign = TextAlign.Start
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = onAddMemory,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.horizontalGradient(listOf(palette.primary, palette.secondary)),
                                        RoundedCornerShape(14.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Add Memory", color = colors.onPrimary, fontWeight = FontWeight.SemiBold)
                            }
                        }
                        OutlinedButton(
                            onClick = onManagePeople,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, cardBorder),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.onSurface),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Text("Manage People")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DialogSectionLabel(text: String) {
    val colors = MaterialTheme.colorScheme
    Text(
        text = text.uppercase(),
        color = colors.onSurface.copy(alpha = 0.7f),
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold
    )
}
