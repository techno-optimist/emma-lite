@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)



package com.yourorg.emma.nativeapp.ui



import android.Manifest

import android.content.Intent

import android.content.pm.PackageManager

import android.net.Uri
import android.provider.OpenableColumns

import android.widget.Toast
import android.util.Base64

import androidx.activity.compose.rememberLauncherForActivityResult

import androidx.activity.result.PickVisualMediaRequest

import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.offset

import androidx.compose.foundation.layout.Arrangement

import androidx.compose.foundation.layout.Box

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope

import androidx.compose.foundation.layout.Row

import androidx.compose.foundation.layout.Spacer

import androidx.compose.foundation.layout.PaddingValues

import androidx.compose.foundation.layout.fillMaxSize

import androidx.compose.foundation.layout.fillMaxWidth

import androidx.compose.foundation.layout.fillMaxHeight

import androidx.compose.foundation.layout.heightIn

import androidx.compose.foundation.layout.height

import androidx.compose.foundation.layout.padding

import androidx.compose.foundation.layout.navigationBarsPadding

import androidx.compose.foundation.layout.statusBarsPadding

import androidx.compose.foundation.layout.size

import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.items

import androidx.compose.material.icons.Icons

import androidx.compose.material.icons.automirrored.filled.Chat


import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check

import androidx.compose.material.icons.automirrored.filled.LibraryBooks

import androidx.compose.material.icons.filled.Menu

import androidx.compose.material.icons.filled.Person

import androidx.compose.material.icons.filled.Save

import androidx.compose.material.icons.filled.Settings

import androidx.compose.material.icons.filled.Search

import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Close

import androidx.compose.material.icons.filled.Edit

import androidx.compose.material.icons.filled.Shield

import androidx.compose.material3.AlertDialog

import androidx.compose.material3.Button

import androidx.compose.material3.Card

import androidx.compose.material3.CardDefaults

import androidx.compose.material3.ColorScheme

import androidx.compose.material3.ExperimentalMaterial3Api

import androidx.compose.material3.ButtonDefaults

import androidx.compose.material3.MaterialTheme

import androidx.compose.material3.ModalBottomSheet

import androidx.compose.material3.TextFieldDefaults

import androidx.compose.material3.Icon

import androidx.compose.material3.IconButton

import androidx.compose.material3.OutlinedButton

import androidx.compose.material3.OutlinedTextField

import androidx.compose.material3.Scaffold

import androidx.compose.material3.SnackbarHost

import androidx.compose.material3.SnackbarHostState

import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults

import androidx.compose.material3.AssistChip
import androidx.compose.material3.Text

import androidx.compose.material3.TextButton

import androidx.compose.material3.TextField

import androidx.compose.material3.Surface

import androidx.compose.material3.rememberModalBottomSheetState

import androidx.compose.material3.HorizontalDivider

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow

import androidx.compose.runtime.Composable

import androidx.compose.runtime.LaunchedEffect

import androidx.compose.runtime.collectAsState

import androidx.compose.runtime.getValue

import androidx.compose.runtime.mutableStateOf

import androidx.compose.runtime.remember

import androidx.compose.runtime.rememberCoroutineScope

import androidx.compose.runtime.saveable.rememberSaveable

import androidx.compose.runtime.setValue

import androidx.compose.ui.Alignment

import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius

import androidx.compose.ui.draw.clip

import androidx.compose.ui.graphics.Brush

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.foundation.clickable
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel

import com.yourorg.emma.nativeapp.ui.components.VaultControlPanelDialog
import com.yourorg.emma.nativeapp.ui.screens.ChatScreen
import com.yourorg.emma.nativeapp.ui.screens.ConstellationScreen
import com.yourorg.emma.nativeapp.ui.screens.ConstellationViewMode
import com.yourorg.emma.nativeapp.ui.screens.PeopleScreen
import com.yourorg.emma.nativeapp.ui.screens.UnifiedSearchScreen
import com.yourorg.emma.nativeapp.ui.util.decodeMediaMap
import com.yourorg.emma.nativeapp.ui.util.rememberBitmapFromUrl
import com.yourorg.emma.nativeapp.ui.util.toImageBitmap

import androidx.navigation.NavType
import androidx.navigation.compose.NavHost

import androidx.navigation.compose.composable

import androidx.navigation.compose.currentBackStackEntryAsState

import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument

import com.yourorg.emma.nativeapp.ui.orb.EmorbRegistry
import com.yourorg.emma.nativeapp.ui.orb.EmorbSurface

import com.yourorg.emma.nativeapp.ui.theme.EmmaTheme
import com.yourorg.emma.nativeapp.ui.theme.EmmaPalette
import com.yourorg.emma.nativeapp.ui.theme.EmmaThemes
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.ui.theme.EmmaBackgroundOption

import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.buildMemorySummary

import com.yourorg.emma.nativeapp.vault.VaultState

import com.yourorg.emma.nativeapp.vault.VaultStatus

import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.MediaRecord
import com.yourorg.emma.nativeapp.vault.MemoryAttachment
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.CONSTELLATION_LAYOUT_SETTINGS_KEY
import com.yourorg.emma.nativeapp.vault.VaultViewModel
import com.yourorg.emma.nativeapp.vault.VaultResumeStatus
import com.yourorg.emma.nativeapp.vault.VaultCryptoStatus
import com.yourorg.emma.nativeapp.vault.VaultSettingsRecord
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForMemory
import com.yourorg.emma.nativeapp.vault.VaultRepository
import com.yourorg.emma.nativeapp.settings.AiPreferences
import com.yourorg.emma.nativeapp.settings.AiPreferencesState
import com.yourorg.emma.nativeapp.settings.SettingsPreferences
import com.yourorg.emma.nativeapp.settings.SettingsPreferencesState

import com.yourorg.emma.nativeapp.voice.VoiceSender

import com.yourorg.emma.nativeapp.voice.VoiceSessionState

import com.yourorg.emma.nativeapp.voice.VoiceViewModel
import com.yourorg.emma.nativeapp.voice.VoiceConnectivityResult

import kotlinx.coroutines.launch

import java.time.Instant

import java.time.ZoneId

import java.time.format.DateTimeFormatter

import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.PI
import kotlin.math.roundToInt


private enum class AppDestination(val route: String, val label: String) {

    Landing("landing", "Start"),

    Dashboard("dashboard", "Dashboard"),

    Search("search", "Search"),

    Chat("chat", "Chat"),

    Memories("memories", "Memories"),

    People("people", "People"),

    Settings("settings", "Settings")

}



private sealed class PendingVaultAction {
    data class Open(val uri: Uri) : PendingVaultAction()
    data class Create(val uri: Uri) : PendingVaultAction()
    data class Export(val uri: Uri) : PendingVaultAction()
    object Autosave : PendingVaultAction()
    object Share : PendingVaultAction()
}



@Composable

fun EmmaApp() {
    var selectedThemeId by rememberSaveable { mutableStateOf(EmmaThemes.default.id) }
    var selectedBackgroundId by rememberSaveable { mutableStateOf<String?>(null) }
    val currentPalette = EmmaThemes.byId(selectedThemeId)
    val overrideBackground = EmmaThemes.backgroundColorsById(selectedBackgroundId)
    val appliedPalette = if (overrideBackground != null) currentPalette.withBackground(overrideBackground) else currentPalette

    EmmaTheme(palette = appliedPalette) {
        val palette = LocalEmmaPalette.current
        val context = LocalContext.current
        val navController = rememberNavController()
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = navBackStackEntry?.destination?.route
        val vaultRepository = remember { VaultRepository(context.applicationContext) }
        val vaultViewModel: VaultViewModel = viewModel(factory = VaultViewModel.Factory(vaultRepository))
        val voiceViewModel: VoiceViewModel = viewModel(factory = VoiceViewModel.Factory(context, vaultRepository))
        val vaultState by vaultViewModel.state.collectAsState()
        val memories by vaultViewModel.memories.collectAsState()
        val people by vaultViewModel.people.collectAsState()
        val voiceState by voiceViewModel.state.collectAsState()
        val coroutineScope = rememberCoroutineScope()
        val snackbarHostState = remember { SnackbarHostState() }

        var pendingAction by remember { mutableStateOf<PendingVaultAction?>(null) }
        var passphraseInput by remember { mutableStateOf("") }
        var vaultNameInput by remember { mutableStateOf("Mobile Vault") }
        var showVaultPanel by remember { mutableStateOf(false) }
        var showSettingsSheet by remember { mutableStateOf(false) }
        val handleAutosaveToggle: (Boolean) -> Unit = { enabled ->
            if (enabled) {
                pendingAction = PendingVaultAction.Autosave
                passphraseInput = ""
            } else {
                vaultViewModel.toggleAutosave(false)
                coroutineScope.launch { snackbarHostState.showSnackbar("Autosave disabled") }
            }
        }

        val openLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            uri?.let {
                try {
                    context.contentResolver.takePersistableUriPermission(
                        it,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                } catch (_: SecurityException) { }
                pendingAction = PendingVaultAction.Open(it)
                passphraseInput = ""
            }
        }
        val createLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.CreateDocument("application/emma")
        ) { uri ->
            uri?.let {
                try {
                    context.contentResolver.takePersistableUriPermission(
                        it,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                } catch (_: SecurityException) { }
                pendingAction = PendingVaultAction.Create(it)
                passphraseInput = ""
            }
        }
        val exportLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.CreateDocument("application/emma")
        ) { uri ->
            uri?.let {
                pendingAction = PendingVaultAction.Export(it)
                passphraseInput = ""
            }
        }
        val shareLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { }

        LaunchedEffect(vaultState.status, vaultState.error) {
            vaultState.error?.let { snackbarHostState.showSnackbar(it) }
        }

        LaunchedEffect(voiceState.lastError) {
            voiceState.lastError?.let { snackbarHostState.showSnackbar(it) }
        }

        LaunchedEffect(vaultState.status) {
            if (vaultState.status == VaultStatus.Ready) {
                navController.navigate(AppDestination.Dashboard.route) {
                    popUpTo(AppDestination.Landing.route) { inclusive = false }
                }
            }
        }

        LaunchedEffect(currentRoute) {
            val orbRoutes = setOf(AppDestination.Landing.route, AppDestination.Dashboard.route)
            if (currentRoute != null && currentRoute !in orbRoutes) {
                EmorbRegistry.deactivateActive()
            }
        }

        Scaffold(
            topBar = {
                if (currentRoute != AppDestination.Chat.route && currentRoute != AppDestination.Search.route) {
                    EmmaTopBar(
                        vaultState = vaultState,
                        onSave = { vaultViewModel.saveVault() },
                        onExport = {
                            val suggested = (vaultState.vaultName ?: "emma-vault").ifBlank { "emma-vault" }
                            exportLauncher.launch("$suggested.emma")
                        },
                        onShare = {
                            pendingAction = PendingVaultAction.Share
                            passphraseInput = ""
                        }
                    )
                }
            },
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
        , containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onBackground) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(palette.background)
            ) {
                NavHost(
                    navController = navController,
                    startDestination = AppDestination.Landing.route,
                modifier = Modifier.padding(padding)
            ) {
                composable(AppDestination.Landing.route) {
                    val resumeUri = vaultState.lastOpenedUri
                    val resumeNeedsPermission = resumeUri != null && !vaultState.hasPersistedPermission
                    val recentVaultName = vaultState.lastVaultName ?: vaultState.vaultName
                    val recentVaultSubtitle = vaultState.lastOpenedAt
                        ?.toReadableDateTime()
                        ?.let { "Last opened $it" }
                    val showAutosaveResume = vaultState.hasAutosave
                    val onResumeVault = resumeUri?.let {
                        {
                            if (resumeNeedsPermission) {
                                openLauncher.launch(arrayOf("application/emma", "application/octet-stream", "*/*"))
                            } else {
                                pendingAction = PendingVaultAction.Open(it)
                                passphraseInput = ""
                            }
                        }
                    }
                    val onResumeAutosave = if (showAutosaveResume) {
                        {
                            pendingAction = PendingVaultAction.Autosave
                            passphraseInput = ""
                        }
                    } else {
                        null
                    }

                    VaultLandingScreen(
                        statusTitle = vaultState.vaultName ?: "No vault loaded",
                        statusSubtitle = vaultState.message ?: "Connect your .emma vault to continue.",
                        statusIsLoading = vaultState.status == VaultStatus.Loading,
                        onOpenVault = { openLauncher.launch(arrayOf("application/emma", "application/octet-stream", "*/*")) },
                        onCreateVault = {
                            vaultNameInput = "Mobile Vault"
                            createLauncher.launch("new-vault.emma")
                        },
                        showOnboarding = !vaultState.onboardingSeen,
                        onSkipOnboarding = { vaultViewModel.setOnboardingSeen(true) },
                        showContinue = false,
                        onGoToChat = {
                            navController.navigate(AppDestination.Chat.route) { launchSingleTop = true }
                        },
                        onOrbClick = {},
                        recentVaultName = recentVaultName,
                        recentVaultSubtitle = recentVaultSubtitle,
                        resumeNeedsPermission = resumeNeedsPermission,
                        onResumeVault = onResumeVault,
                        showAutosaveResume = showAutosaveResume,
                        onResumeAutosave = onResumeAutosave
                    )
                }

                composable(AppDestination.Dashboard.route) {
                    DashboardScreen(
                        vaultState = vaultState,
                        onOrbClick = {
                            EmorbRegistry.deactivateActive()
                            navController.navigate(AppDestination.Chat.route)
                        },
                        onSearch = {
                            navController.navigate(AppDestination.Search.route) { launchSingleTop = true }
                        },
                        onMemories = {
                            EmorbRegistry.deactivateActive()
                            navController.navigate(AppDestination.Memories.route)
                        },
                        onPeople = {
                            EmorbRegistry.deactivateActive()
                            navController.navigate(AppDestination.People.route)
                        },
                        onSettings = { showSettingsSheet = true },
                        onVaultPanel = { showVaultPanel = true }
                    )
                }

                composable(AppDestination.Search.route) {
                    UnifiedSearchScreen(
                        memories = memories,
                        people = people,
                        onBack = { navController.navigateUp() },
                        onOpenPeople = { name ->
                            val encoded = Uri.encode(name)
                            navController.navigate(AppDestination.People.route + "?query=$encoded") { launchSingleTop = true }
                        },
                        onOpenMemory = { query ->
                            val encoded = Uri.encode(query)
                            navController.navigate(AppDestination.Memories.route + "?mode=gallery&query=$encoded") { launchSingleTop = true }
                        }
                    )
                }

                composable(AppDestination.Chat.route) {
                    ChatScreen(
                        vaultState = vaultState,
                        voiceState = voiceState,
                        onConnect = { voiceViewModel.connect() },
                        onDisconnect = { voiceViewModel.disconnect() },
                        onSend = { text, attachments -> voiceViewModel.sendText(text, attachments) },
                        onOpenMemory = { query ->
                            val encoded = Uri.encode(query)
                            navController.navigate(AppDestination.Memories.route + "?mode=gallery&query=$encoded") {
                                launchSingleTop = true
                            }
                        },
                        onOpenPerson = { name ->
                            val encoded = Uri.encode(name)
                            navController.navigate(AppDestination.People.route + "?query=$encoded") { launchSingleTop = true }
                        },
                        onAddPerson = {
                            navController.navigate(AppDestination.People.route + "?query=&add=true") { launchSingleTop = true }
                        },
                        onToggleRecording = { voiceViewModel.toggleRecording() },
                        onMicPermissionResult = { voiceViewModel.updateMicPermission(it) },
                        onSetVoicePlayback = { voiceViewModel.setVoicePlaybackEnabled(it) },
                        onClose = { navController.navigateUp() }
                    )
                }

                composable(
                    route = AppDestination.Memories.route + "?mode={mode}&query={query}",
                    arguments = listOf(
                        navArgument("mode") { type = NavType.StringType; defaultValue = "constellation" },
                        navArgument("query") { type = NavType.StringType; defaultValue = "" }
                    )
                ) { backStackEntry ->
                    val media = vaultState.payload?.content?.media.orEmpty().decodeMediaMap()
                    val vaultLayoutJson = vaultState.payload?.content?.settings?.get(CONSTELLATION_LAYOUT_SETTINGS_KEY)
                    val vaultKey = remember(vaultState.activeUri, vaultState.lastOpenedUri, vaultState.vaultName) {
                        buildVaultKey(vaultState)
                    }
                    var editingMemory by remember { mutableStateOf<MemoryRecord?>(null) }
                    val initialQuery = backStackEntry.arguments?.getString("query").orEmpty()
                    val initialMode = when (backStackEntry.arguments?.getString("mode")?.lowercase()) {
                        "gallery" -> ConstellationViewMode.Gallery
                        else -> ConstellationViewMode.Constellation
                    }
                    ConstellationScreen(
                        memories = memories,
                        people = people,
                        media = media,
                        vaultKey = vaultKey,
                        vaultLayoutJson = vaultLayoutJson,
                        onPersistLayoutToVault = { layout ->
                            if (vaultState.status == VaultStatus.Ready) {
                                vaultViewModel.updateConstellationLayout(layout)
                            }
                        },
                        onBack = { navController.navigateUp() },
                        onCreateMemory = {
                            navController.navigate(AppDestination.Chat.route) { launchSingleTop = true }
                        },
                        onCreateMemoryManually = { title, body, selectedPeople, attachments, tags ->
                            vaultViewModel.addMemory(
                                title = title,
                                body = body,
                                attachments = attachments,
                                people = selectedPeople,
                                tags = tags
                            )
                        },
                        memoryPreview = { mem, onDismiss, onEdit ->
                            MemoryPreviewDialog(
                                memory = mem,
                                media = media,
                                people = people,
                                onDismiss = onDismiss,
                                onEdit = {
                                    onDismiss()
                                    onEdit?.invoke()
                                }
                            )
                        },
                        onEditMemory = { editingMemory = it },
                        onManagePeople = { navController.navigate(AppDestination.People.route) { launchSingleTop = true } },
                        initialMode = initialMode,
                        initialQuery = initialQuery
                    )
                    editingMemory?.let { memory ->
                        EditMemoryDialog(
                            memory = memory,
                            people = people,
                            media = media,
                            vaultReady = vaultState.status == VaultStatus.Ready,
                            onDismiss = { editingMemory = null },
                            onManagePeople = {
                                editingMemory = null
                                navController.navigate(AppDestination.People.route) { launchSingleTop = true }
                            },
                            onSave = { title, body, selectedPeople, keptAttachments, newAttachments, tags ->
                                vaultViewModel.updateMemory(
                                    memoryId = memory.id,
                                    title = title,
                                    body = body,
                                    people = selectedPeople,
                                    keptAttachments = keptAttachments,
                                    newAttachments = newAttachments,
                                    tags = tags
                                )
                                editingMemory = null
                            }
                        )
                    }
                }

                composable(
                    route = AppDestination.People.route + "?query={query}&add={add}",
                    arguments = listOf(
                        navArgument("query") { type = NavType.StringType; defaultValue = "" },
                        navArgument("add") { type = NavType.BoolType; defaultValue = false }
                    )
                ) { backStackEntry ->
                    val initialQuery = backStackEntry.arguments?.getString("query").orEmpty()
                    val startInAddMode = backStackEntry.arguments?.getBoolean("add") ?: false
                    PeopleScreen(
                        vaultState = vaultState,
                        memories = memories,
                        people = people,
                        onUpsertPerson = { id, name, relation, contact, avatarData, avatarMime ->
                            vaultViewModel.upsertPerson(id, name, relation, contact, avatarData = avatarData, avatarMime = avatarMime)
                        },
                        onDeletePerson = { id -> vaultViewModel.deletePerson(id) },
                        onNavigateDashboard = {
                            if (!navController.popBackStack(AppDestination.Dashboard.route, inclusive = false)) {
                                navController.navigate(AppDestination.Dashboard.route) { launchSingleTop = true }
                            }
                        },
                        initialQuery = initialQuery,
                        startInAddMode = startInAddMode
                    )
                }


                composable(AppDestination.Settings.route) {
                    SettingsScreen(
                        vaultState = vaultState,
                        onClose = { navController.navigateUp() },
                        themeOptions = EmmaThemes.options,
                        selectedTheme = currentPalette,
                        onThemeSelected = { selectedThemeId = it },
                        backgroundOptions = EmmaThemes.backgrounds,
                        selectedBackgroundId = selectedBackgroundId ?: "",
                        onBackgroundSelected = { id -> selectedBackgroundId = if (id.isEmpty()) null else id },
                        onToggleAutosave = handleAutosaveToggle,
                        onSaveSettings = { settings -> vaultViewModel.updateVaultSettings(settings) }
                    )
                }
            }

            if (showVaultPanel) {
                VaultControlPanelDialog(
                    vaultState = vaultState,
                    onClose = { showVaultPanel = false },
                    onOpenVault = { openLauncher.launch(arrayOf("application/emma", "application/octet-stream", "*/*")) },
                    onCreateVault = {
                        vaultNameInput = "Mobile Vault"
                        createLauncher.launch("new-vault.emma")
                    },
                    onExport = {
                        val suggested = (vaultState.vaultName ?: "emma-vault").ifBlank { "emma-vault" }
                        exportLauncher.launch("$suggested.emma")
                        coroutineScope.launch { snackbarHostState.showSnackbar("Choose where to download the vault") }
                    },
                    onShare = {
                        pendingAction = PendingVaultAction.Share
                        passphraseInput = ""
                        showVaultPanel = false
                        coroutineScope.launch { snackbarHostState.showSnackbar("Enter passphrase to share") }
                    },
                    onSave = {
                        vaultViewModel.saveVault()
                        coroutineScope.launch { snackbarHostState.showSnackbar("Saving vault...") }
                    },
                    onLock = {
                        vaultViewModel.lockVault()
                        showVaultPanel = false
                        pendingAction = null
                        passphraseInput = ""
                        if (!navController.popBackStack(AppDestination.Landing.route, inclusive = false)) {
                            navController.navigate(AppDestination.Landing.route) { launchSingleTop = true }
                        }
                        coroutineScope.launch { snackbarHostState.showSnackbar("Vault locked") }
                    },
                    onToggleAutosave = { enabled ->
                        if (enabled) {
                            showVaultPanel = false
                        }
                        handleAutosaveToggle(enabled)
                    }
                )
            }

            if (showSettingsSheet) {
                SettingsScreen(
                    vaultState = vaultState,
                    onClose = { showSettingsSheet = false },
                    themeOptions = EmmaThemes.options,
                    selectedTheme = currentPalette,
                    onThemeSelected = { selectedThemeId = it },
                    backgroundOptions = EmmaThemes.backgrounds,
                    selectedBackgroundId = selectedBackgroundId ?: "",
                    onBackgroundSelected = { id -> selectedBackgroundId = if (id.isEmpty()) null else id },
                    onToggleAutosave = handleAutosaveToggle,
                    onSaveSettings = { settings -> vaultViewModel.updateVaultSettings(settings) }
                )
            }

            if (pendingAction != null) {
                PassphraseDialog(
                    action = pendingAction!!,
                    passphrase = passphraseInput,
                    vaultName = vaultNameInput,
                    onVaultNameChange = { vaultNameInput = it },
                    onPassphraseChange = { passphraseInput = it },
                    onDismiss = { pendingAction = null; passphraseInput = "" },
                    onConfirm = { pass ->
                        val passChars = pass.toCharArray()
                        when (val action = pendingAction) {
                            is PendingVaultAction.Open -> vaultViewModel.openVault(action.uri, passChars)
                            is PendingVaultAction.Create -> vaultViewModel.createVault(vaultNameInput, action.uri, passChars)
                            is PendingVaultAction.Export -> vaultViewModel.exportVault(action.uri, passChars)
                            PendingVaultAction.Autosave -> vaultViewModel.openAutosave(passChars)
                            PendingVaultAction.Share -> {
                                coroutineScope.launch {
                                    val shareUri = vaultViewModel.prepareShare(passChars)
                                    if (shareUri != null) {
                                        val intent = Intent(Intent.ACTION_SEND).apply {
                                            type = "application/emma"
                                            putExtra(Intent.EXTRA_STREAM, shareUri)
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        shareLauncher.launch(Intent.createChooser(intent, "Share vault"))
                                    } else {
                                        Toast.makeText(context, "Unable to prepare share", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                            null -> {}
                        }
                        passphraseInput = ""
                        pendingAction = null
                    }
                )
            }
        }
    }
}
}

@Composable
private fun EmmaTopBar(
    vaultState: VaultState,
    onSave: () -> Unit,
    onExport: () -> Unit,
    onShare: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current

    val (statusLabel, statusColor) = when (vaultState.status) {
        VaultStatus.Ready -> if (vaultState.isDirty) {
            "Unsaved changes" to palette.secondary
        } else {
            "Synced" to palette.primary
        }
        VaultStatus.Loading -> "Loading vault..." to palette.secondary
        VaultStatus.Error -> "Vault error" to colors.error
        else -> "No vault" to colors.onSurface.copy(alpha = 0.7f)
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            color = colors.surface.copy(alpha = 0.9f),
            tonalElevation = 8.dp,
            shadowElevation = 10.dp,
            border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.32f))
        ) {
            Row(
                modifier = Modifier
                    .background(
                        Brush.linearGradient(
                            listOf(
                                palette.primary.copy(alpha = 0.20f),
                                palette.secondary.copy(alpha = 0.12f),
                                Color.Transparent
                            )
                        )
                    )
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = vaultState.vaultName ?: "Emma vault",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatusPill(label = statusLabel, color = statusColor)
                    }
                }

                if (vaultState.status == VaultStatus.Ready) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        TopBarActionButton(
                            icon = Icons.Default.Save,
                            description = "Save vault",
                            onClick = onSave
                        )
                        TopBarActionButton(
                            icon = Icons.Default.CloudUpload,
                            description = "Export vault",
                            onClick = onExport
                        )
                        TopBarActionButton(
                            icon = Icons.Default.Share,
                            description = "Share vault",
                            onClick = onShare
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusPill(label: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(color.copy(alpha = 0.16f))
            .border(BorderStroke(1.dp, color.copy(alpha = 0.45f)), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(color)
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun TopBarActionButton(
    icon: ImageVector,
    description: String,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.size(44.dp),
        shape = CircleShape,
        color = colors.surface.copy(alpha = 0.8f),
        tonalElevation = 6.dp,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.28f))
    ) {
        IconButton(onClick = onClick, modifier = Modifier.fillMaxSize()) {
            Icon(icon, contentDescription = description, tint = colors.onSurface)
        }
    }
}



@Composable

private fun PassphraseDialog(

    action: PendingVaultAction,

    passphrase: String,

    vaultName: String,

    onVaultNameChange: (String) -> Unit,

    onPassphraseChange: (String) -> Unit,

    onDismiss: () -> Unit,

    onConfirm: (String) -> Unit

) {

    var showPass by remember { mutableStateOf(false) }

    val isCreate = action is PendingVaultAction.Create

    AlertDialog(

        onDismissRequest = onDismiss,

        title = { Text("Enter vault passphrase") },

        text = {

            Column {

                if (isCreate) {

                    TextField(

                        value = vaultName,

                        onValueChange = onVaultNameChange,

                        label = { Text("Vault name") },

                        singleLine = true

                    )

                    Spacer(modifier = Modifier.size(8.dp))

                }

                TextField(

                    value = passphrase,

                    onValueChange = onPassphraseChange,

                    label = { Text("Passphrase") },

                    visualTransformation = if (showPass) VisualTransformation.None else PasswordVisualTransformation(),

                    singleLine = true

                )

                TextButton(onClick = { showPass = !showPass }) {

                    Text(if (showPass) "Hide" else "Show")

                }

            }

        },

        confirmButton = {

            Button(onClick = { onConfirm(passphrase) }, enabled = passphrase.isNotBlank()) {

                Text("Continue")

            }

        },

        dismissButton = {

            TextButton(onClick = onDismiss) { Text("Cancel") }

        }

    )

}



@Composable

private fun DashboardScreen(

    vaultState: VaultState,

    onOrbClick: () -> Unit,

    onSearch: () -> Unit,

    onMemories: () -> Unit,

    onPeople: () -> Unit,

    onSettings: () -> Unit,
    onVaultPanel: () -> Unit

) {

    var menuOpen by remember { mutableStateOf(false) }
    var panelOpen by remember { mutableStateOf(false) }
    val palette = LocalEmmaPalette.current
    val orbSize = 170.dp
    Box(

        modifier = Modifier

            .fillMaxSize()

            .background(palette.background)

    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 20.dp, top = 0.dp, bottom = 16.dp)
                .align(Alignment.TopCenter),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TopBarActionButton(
                    icon = Icons.Filled.Menu,
                    description = "Dashboard panels",
                    onClick = { panelOpen = true }
                )
                DashboardSearchPill(
                    modifier = Modifier.weight(1f),
                    onSearch = onSearch
                )
            }
        }

        // Central orb

        Box(

            modifier = Modifier

                .fillMaxSize(),

            contentAlignment = Alignment.Center

        ) {

            Box(

                modifier = Modifier

                    .size(orbSize)

                    .clip(RoundedCornerShape(orbSize / 2))

                    .background(Color.Transparent)

                    .clickable {

                        menuOpen = !menuOpen

                    },

                contentAlignment = Alignment.Center

            ) {

                EmorbSurface(
                    modifier = Modifier
                        .size(orbSize)
                        .clip(RoundedCornerShape(orbSize / 2))
                )

            }

            RadialMenu(

                visible = menuOpen,

                palette = palette,

                orbSize = orbSize,

                onMemories = { menuOpen = false; onMemories() },

                onPeople = { menuOpen = false; onPeople() },

                onChat = { menuOpen = false; onOrbClick() }

            )

        }



        // Floating buttons bottom corners

        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(20.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            CircleIconButton(icon = Icons.Default.Settings, onClick = onSettings)
            CircleIconButton(icon = Icons.Default.Shield, onClick = onVaultPanel)
        }

    }

    if (panelOpen) {
        DashboardMenuSheet(
            vaultState = vaultState,
            onDismiss = { panelOpen = false },
            onQuickChat = {
                panelOpen = false
                onOrbClick()
            },
            onQuickMemories = {
                panelOpen = false
                onMemories()
            },
            onQuickPeople = {
                panelOpen = false
                onPeople()
            },
            onQuickSettings = {
                panelOpen = false
                onSettings()
            },
            onQuickVault = {
                panelOpen = false
                onVaultPanel()
            }
        )
    }

}



@Composable
private fun DashboardSearchPill(
    modifier: Modifier = Modifier,
    onSearch: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Surface(
        modifier = modifier
            .height(48.dp)
            .clickable { onSearch() },
        shape = RoundedCornerShape(24.dp),
        color = colors.surface.copy(alpha = 0.88f),
        tonalElevation = 6.dp,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.24f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(Icons.Filled.Search, contentDescription = "Search", tint = colors.onSurface.copy(alpha = 0.7f))
            Text(
                text = "Search memories, people, tags",
                color = colors.onSurface.copy(alpha = 0.72f),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }

}

@Composable
private fun DashboardWidgetCard(
    title: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        color = colors.surface.copy(alpha = 0.88f),
        tonalElevation = 6.dp,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.18f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = colors.onSurface.copy(alpha = 0.7f)
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurface.copy(alpha = 0.64f)
            )
        }
    }
}

@Composable
private fun DashboardMenuSheet(
    vaultState: VaultState,
    onDismiss: () -> Unit,
    onQuickChat: () -> Unit,
    onQuickMemories: () -> Unit,
    onQuickPeople: () -> Unit,
    onQuickSettings: () -> Unit,
    onQuickVault: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val memoryCount = vaultState.payload?.stats?.memoryCount ?: 0
    val peopleCount = vaultState.payload?.stats?.peopleCount ?: 0
    val mediaCount = vaultState.payload?.stats?.mediaCount ?: 0
    val lastSaved = vaultState.lastSavedAt?.toReadableDateTime() ?: "Not saved yet"
    val scrollState = rememberScrollState()
    val today = DateTimeFormatter.ofPattern("EEEE, MMM d")
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(System.currentTimeMillis()))

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.surface,
        contentColor = colors.onSurface,
        dragHandle = { SettingsSheetDragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Dashboard panels", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "Daily brief, insights, and shortcuts.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurface.copy(alpha = 0.7f)
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Filled.Close, contentDescription = "Close panels")
                }
            }

            DashboardPanelSection(
                title = "Daily brief",
                subtitle = today
            ) {
                Text(
                    text = "You have $memoryCount memories and $peopleCount people in this vault.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.78f)
                )
                Text(
                    text = "Last saved: $lastSaved",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.7f)
                )
                DashboardActionRow(
                    primaryLabel = "Review memories",
                    onPrimary = onQuickMemories,
                    secondaryLabel = "Open chat",
                    onSecondary = onQuickChat
                )
            }

            DashboardPanelSection(
                title = "Insights",
                subtitle = "Vault highlights"
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    DashboardWidgetCard(
                        title = "Memories",
                        value = memoryCount.toString(),
                        subtitle = "in vault",
                        modifier = Modifier.weight(1f)
                    )
                    DashboardWidgetCard(
                        title = "People",
                        value = peopleCount.toString(),
                        subtitle = "connected",
                        modifier = Modifier.weight(1f)
                    )
                }
                DashboardWidgetCard(
                    title = "Last saved",
                    value = lastSaved,
                    subtitle = if (vaultState.autosaveEnabled) "Autosave on" else "Autosave off",
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = "Media items stored: $mediaCount",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.78f)
                )
                DashboardActionRow(
                    primaryLabel = "View people",
                    onPrimary = onQuickPeople,
                    secondaryLabel = "Open vault panel",
                    onSecondary = onQuickVault
                )
            }

            DashboardPanelSection(
                title = "Quick actions",
                subtitle = "Jump to the next task"
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    DashboardQuickActionButton(
                        icon = Icons.AutoMirrored.Filled.Chat,
                        label = "Chat",
                        onClick = onQuickChat,
                        modifier = Modifier.weight(1f)
                    )
                    DashboardQuickActionButton(
                        icon = Icons.AutoMirrored.Filled.LibraryBooks,
                        label = "Memories",
                        onClick = onQuickMemories,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    DashboardQuickActionButton(
                        icon = Icons.Filled.Person,
                        label = "People",
                        onClick = onQuickPeople,
                        modifier = Modifier.weight(1f)
                    )
                    DashboardQuickActionButton(
                        icon = Icons.Filled.Settings,
                        label = "Settings",
                        onClick = onQuickSettings,
                        modifier = Modifier.weight(1f)
                    )
                }
                DashboardQuickActionButton(
                    icon = Icons.Filled.Shield,
                    label = "Vault",
                    onClick = onQuickVault,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun DashboardPanelSection(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = colors.surface.copy(alpha = 0.9f),
        tonalElevation = 6.dp,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.18f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = colors.onSurface.copy(alpha = 0.7f))
            content()
        }
    }
}

@Composable
private fun DashboardActionRow(
    primaryLabel: String,
    onPrimary: () -> Unit,
    secondaryLabel: String,
    onSecondary: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Button(
            onClick = onPrimary,
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = palette.primary, contentColor = colors.onPrimary)
        ) {
            Text(primaryLabel, fontWeight = FontWeight.SemiBold)
        }
        OutlinedButton(
            onClick = onSecondary,
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.22f)),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.onSurface)
        ) {
            Text(secondaryLabel, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun DashboardQuickActionButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 56.dp),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.22f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = colors.surface.copy(alpha = 0.7f),
            contentColor = colors.onSurface
        ),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 10.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null)
            Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
        }
    }
}

private data class RadialAction(
    val label: String,
    val icon: ImageVector,
    val angle: Float,
    val onClick: () -> Unit
)



@Composable

private fun RadialMenu(

    visible: Boolean,

    palette: EmmaPalette,

    orbSize: Dp,

    onMemories: () -> Unit,

    onPeople: () -> Unit,

    onChat: () -> Unit

) {

    val colors = MaterialTheme.colorScheme
    val density = LocalDensity.current
    val actions = listOf(
        RadialAction("Memories", Icons.AutoMirrored.Filled.LibraryBooks, -90f, onMemories),
        RadialAction("People", Icons.Default.Person, 30f, onPeople),
        RadialAction("Chat", Icons.AutoMirrored.Filled.Chat, 150f, onChat)
    )
    val orbitRadius = maxOf(88.dp, orbSize * 0.75f)
    val expansion by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 220, easing = FastOutSlowInEasing),
        label = "radialMenuExpansion"
    )

    if (!visible && expansion <= 0.01f) return

    Box(

        modifier = Modifier.fillMaxSize(),

        contentAlignment = Alignment.Center

    ) {

        actions.forEach { action ->

            RadialItem(

                label = action.label,

                icon = action.icon,

                palette = palette,

                colors = colors,

                angle = action.angle,

                radiusPx = with(density) { orbitRadius.toPx() } * expansion,

                alpha = expansion,

                onClick = action.onClick

            )

        }

    }

}



@Composable

private fun RadialItem(

    label: String,

    icon: ImageVector,

    palette: EmmaPalette,

    colors: ColorScheme,

    angle: Float,

    radiusPx: Float,

    alpha: Float,

    onClick: () -> Unit

) {

    val itemSize = 86.dp
    val angleRad = angle * PI.toFloat() / 180f
    val offsetX = (cos(angleRad) * radiusPx).roundToInt()
    val offsetY = (sin(angleRad) * radiusPx).roundToInt()
    val scale = 0.85f + 0.15f * alpha
    Box(

        modifier = Modifier

            .offset { IntOffset(offsetX, offsetY) }

            .graphicsLayer(
                alpha = alpha,
                scaleX = scale,
                scaleY = scale
            ),

        contentAlignment = Alignment.Center

    ) {

        Box(

            modifier = Modifier

                .size(itemSize)

                .shadow(

                    elevation = 18.dp,

                    shape = CircleShape,

                    ambientColor = palette.primary.copy(alpha = 0.32f),

                    spotColor = palette.secondary.copy(alpha = 0.32f)

                )

                .clip(CircleShape)

                .background(

                    brush = Brush.linearGradient(

                        listOf(

                            colors.surface.copy(alpha = 0.7f),

                            colors.surface.copy(alpha = 0.5f)

                        )

                    )

                )

                .border(

                    width = 1.5.dp,

                    brush = Brush.linearGradient(

                        listOf(

                            palette.primary.copy(alpha = 0.65f),

                            palette.secondary.copy(alpha = 0.65f)

                        )

                    ),

                    shape = CircleShape

                )

                .clickable(

                    enabled = alpha > 0.6f,

                    onClick = onClick

                ),

            contentAlignment = Alignment.Center

        ) {

            Box(

                modifier = Modifier

                    .fillMaxSize()

                    .clip(CircleShape)

                    .background(

                        brush = Brush.radialGradient(

                            listOf(

                                palette.primary.copy(alpha = 0.28f),

                                palette.secondary.copy(alpha = 0.14f)

                            )

                        )

                    )

            )

            Column(

                horizontalAlignment = Alignment.CenterHorizontally,

                verticalArrangement = Arrangement.Center,

                modifier = Modifier

                    .fillMaxSize()

                    .padding(horizontal = 14.dp, vertical = 12.dp)

            ) {

                Icon(icon, contentDescription = label, tint = colors.onPrimary, modifier = Modifier.size(26.dp))

                Spacer(modifier = Modifier.height(4.dp))

                Text(

                    label,

                    color = colors.onPrimary,

                    fontWeight = FontWeight.SemiBold,

                    fontSize = 11.sp,

                    textAlign = TextAlign.Center,

                    maxLines = 1

                )

            }

        }

    }

}



@Composable

private fun CircleIconButton(icon: ImageVector, onClick: () -> Unit) {

    val colors = MaterialTheme.colorScheme
    Card(

        shape = RoundedCornerShape(50),

        colors = CardDefaults.cardColors(containerColor = colors.primary.copy(alpha = 0.16f)),

        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),

        modifier = Modifier

            .size(56.dp)

            .clickable { onClick() }

    ) {

        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {

            Icon(icon, contentDescription = null, tint = colors.onPrimary)

        }

    }

}



@Composable
private fun MemoryPreviewDialog(
    memory: MemoryRecord,
    media: Map<String, MediaRecord>,
    people: List<PersonRecord>,
    onDismiss: () -> Unit,
    onEdit: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val cardSurface = colors.surface
    val headerTint = lerp(cardSurface, palette.primary, 0.16f)
    val midTint = lerp(cardSurface, palette.secondary, 0.12f)
    val iconBrush = Brush.linearGradient(listOf(palette.primary, palette.secondary))
    val cardBorder = colors.outlineVariant
    val attachments = remember(memory.attachments, media) {
        memory.attachments.map { att ->
            val bmp = media[att.id]?.data?.let { Base64.decode(it, Base64.NO_WRAP).toImageBitmap() }
            att to bmp
        }
    }
    val hero = attachments.firstOrNull { it.second != null }?.second
    val summary = remember(memory.summary, memory.body) {
        memory.summary ?: buildMemorySummary(memory.body)
    }
    val resolvedPeople = remember(memory.id, people) {
        resolvePeopleIdsForMemory(memory, people)
    }
    val peopleLabels = remember(resolvedPeople, memory.people, people) {
        if (resolvedPeople.isNotEmpty()) {
            resolvedPeople.map { id -> people.firstOrNull { it.id == id }?.name ?: id }
        } else {
            memory.people
        }
    }
    val scrollState = rememberScrollState()
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
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = cardSurface
                ),
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
                          Column {
                              Text(
                                  memory.title.ifBlank { "Memory" },
                                  fontWeight = FontWeight.Bold,
                                  fontSize = 22.sp
                              )
                              Text(
                                  memory.created.takeIf { it.isNotBlank() }?.let { formatDate(it) } ?: "",
                                  color = colors.onSurface.copy(alpha = 0.7f),
                                  fontSize = 12.sp
                              )
                              memory.updated?.takeIf { it.isNotBlank() }?.let { updated ->
                                  Text(
                                      "Updated ${formatDateTime(updated)}",
                                      color = colors.onSurface.copy(alpha = 0.6f),
                                      fontSize = 11.sp
                                  )
                              }
                          }
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

                    hero?.let { preview ->
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp)
                        ) {
                            Image(
                                bitmap = preview,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }

                    if (!summary.isNullOrBlank() && summary.trim() != memory.body.trim()) {
                        SectionLabel("Summary")
                        Text(
                            summary,
                            textAlign = TextAlign.Start,
                            color = colors.onSurface.copy(alpha = 0.9f),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }

                    Text(
                        memory.body.ifBlank { "No details yet." },
                        textAlign = TextAlign.Start,
                        color = colors.onSurface,
                        style = MaterialTheme.typography.bodyMedium
                    )

                    if (memory.tags.isNotEmpty()) {
                        SectionLabel("Tags")
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            memory.tags.forEach { tag ->
                                TagChip(text = tag)
                            }
                        }
                    }

                    if (peopleLabels.isNotEmpty()) {
                        SectionLabel("People")
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            peopleLabels.forEach { label ->
                                AssistChip(label = { Text(label) }, onClick = { })
                            }
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        onEdit?.let {
                            Button(
                                onClick = it,
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                                contentPadding = PaddingValues(),
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
                                    Text("Edit Memory", color = colors.onPrimary, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        OutlinedButton(
                            onClick = onShare ?: onDismiss,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, cardBorder),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.onSurface),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Text(if (onShare != null) "Share Memory" else "Close")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EditMemoryDialog(
    memory: MemoryRecord,
    people: List<PersonRecord>,
    media: Map<String, MediaRecord>,
    vaultReady: Boolean,
    onDismiss: () -> Unit,
    onManagePeople: () -> Unit,
    onSave: (
        title: String,
        body: String,
        selectedPeople: List<String>,
        keptAttachments: List<MemoryAttachment>,
        newAttachments: List<MemoryAttachmentInput>,
        tags: List<String>
    ) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val context = LocalContext.current
    var title by remember(memory.id) { mutableStateOf(memory.title) }
    var body by remember(memory.id) { mutableStateOf(memory.body) }
    val resolvedPeopleIds = remember(memory.id, people) { resolvePeopleIdsForMemory(memory, people).toSet() }
    var selectedPeople by remember(memory.id) { mutableStateOf(resolvedPeopleIds) }
    var keptAttachments by remember(memory.id) { mutableStateOf(memory.attachments) }
    var newAttachments by remember(memory.id) { mutableStateOf<List<MemoryAttachmentInput>>(emptyList()) }
    var tags by remember(memory.id) { mutableStateOf(memory.tags) }
    var tagInput by remember { mutableStateOf("") }
    var renameTarget by remember { mutableStateOf<AttachmentRenameTarget?>(null) }
    var renameInput by remember { mutableStateOf("") }
    val scrollState = rememberScrollState()
    val cardSurface = colors.surface
    val headerTint = lerp(cardSurface, palette.primary, 0.16f)
    val midTint = lerp(cardSurface, palette.secondary, 0.12f)
    val iconBrush = Brush.linearGradient(listOf(palette.primary, palette.secondary))
    val cardBorder = colors.outlineVariant
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
    val existingPreviews = remember(keptAttachments, media) {
        keptAttachments.map { att ->
            val bmp = media[att.id]?.data?.let { Base64.decode(it, Base64.NO_WRAP).toImageBitmap() }
            att to bmp
        }
    }
    val newPreviews = remember(newAttachments) {
        newAttachments.map { att -> att to att.bytes.toImageBitmap() }
    }
      val attachmentCount = existingPreviews.size + newPreviews.size

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
                        Text("Edit Memory", fontWeight = FontWeight.Bold, fontSize = 22.sp)
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

                    SectionLabel("Metadata:")
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        MetaRow(label = "Created", value = formatDateTime(memory.created))
                        memory.updated?.takeIf { it.isNotBlank() }?.let { updated ->
                            MetaRow(label = "Last updated", value = formatDateTime(updated))
                        }
                    }

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

                    SectionLabel("Attachments ($attachmentCount):")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(existingPreviews, key = { it.first.id }) { (att, bmp) ->
                            AttachmentTile(
                                image = bmp,
                                label = att.name,
                                onRemove = { keptAttachments = keptAttachments.filterNot { it.id == att.id } },
                                onRename = {
                                    renameTarget = AttachmentRenameTarget(att.name) { newName ->
                                        keptAttachments = keptAttachments.map { existing ->
                                            if (existing.id == att.id) {
                                                existing.copy(name = newName)
                                            } else {
                                                existing
                                            }
                                        }
                                    }
                                }
                            )
                        }
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
                                      title,
                                      body,
                                      selectedPeople.toList(),
                                      keptAttachments,
                                      newAttachments,
                                      tags
                                  )
                              },
                            enabled = vaultReady,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = palette.primary,
                                contentColor = colors.onPrimary
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Text("Save changes")
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
private fun MetaRow(label: String, value: String) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = colors.onSurface.copy(alpha = 0.7f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = colors.onSurface
        )
    }
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

private data class AttachmentRenameTarget(
    val currentName: String,
    val onConfirm: (String) -> Unit
)

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

@Composable
private fun SettingsScreen(
    vaultState: VaultState,
    onClose: () -> Unit,
    themeOptions: List<EmmaPalette>,
    selectedTheme: EmmaPalette,
    onThemeSelected: (String) -> Unit,
    backgroundOptions: List<EmmaBackgroundOption>,
    selectedBackgroundId: String,
    onBackgroundSelected: (String) -> Unit,
    onToggleAutosave: (Boolean) -> Unit,
    onSaveSettings: (VaultSettingsRecord) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val listState = rememberLazyListState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var navSheetOpen by remember { mutableStateOf(false) }
    val dismissSheet: () -> Unit = {
        scope.launch {
            sheetState.hide()
            onClose()
        }
        Unit
    }

      val aiPreferences = remember { AiPreferences(context.applicationContext) }
      val aiPreferencesState by aiPreferences.state.collectAsState(initial = AiPreferencesState())
      val hasApiKey = !aiPreferencesState.openAiApiKey.isNullOrBlank()
      val apiEnabled = aiPreferencesState.apiEnabled
      var showApiKeyDialog by remember { mutableStateOf(false) }
      var apiKeyInput by remember { mutableStateOf("") }
      var showApiKey by remember { mutableStateOf(false) }

    val settingsPreferences = remember { SettingsPreferences(context.applicationContext) }
    val settingsState by settingsPreferences.state.collectAsState(initial = SettingsPreferencesState())
    val memoryDetection = settingsState.memoryDetection
    val peopleRecognition = settingsState.peopleRecognition
    val dementiaMode = settingsState.dementiaMode
    val careAccessibilityEnabled = settingsState.careAccessibilityEnabled
    val autoCapture = settingsState.autoCapture
    val reducedMotion = settingsState.reducedMotion
    val highContrast = settingsState.highContrast
    val fontSize = settingsState.fontSize
    val autoSave = vaultState.autosaveEnabled

    val sections = buildList {
        add(
            SettingsSection("visual", "Visual Themes") {
                VisualThemesSection(
                    themeOptions = themeOptions,
                    selectedTheme = selectedTheme,
                    onThemeSelected = onThemeSelected,
                    backgroundOptions = backgroundOptions,
                    selectedBackgroundId = selectedBackgroundId,
                    onBackgroundSelected = onBackgroundSelected
                )
            }
        )
        add(
            SettingsSection("ai", "Intelligence") {
                  IntelligenceSection(
                      hasApiKey = hasApiKey,
                      apiEnabled = apiEnabled,
                      vaultReady = vaultState.status == VaultStatus.Ready,
                      onManageApiKey = {
                          apiKeyInput = ""
                          showApiKey = false
                          showApiKeyDialog = true
                      },
                      onToggleApiEnabled = { enabled ->
                          scope.launch { aiPreferences.setApiEnabled(enabled) }
                      },
                      memoryDetection = memoryDetection,
                      peopleRecognition = peopleRecognition,
                      onToggleMemory = { enabled ->
                          scope.launch { settingsPreferences.setMemoryDetection(enabled) }
                    },
                    onTogglePeople = { enabled ->
                        scope.launch { settingsPreferences.setPeopleRecognition(enabled) }
                    }
                )
            }
        )
        add(
            SettingsSection("care", "Memory & Care") {
                MemoryCareSection(
                    dementiaMode = dementiaMode,
                    autoCapture = autoCapture,
                    careAccessibilityEnabled = careAccessibilityEnabled,
                    onToggleDementia = { enabled ->
                        scope.launch { settingsPreferences.setDementiaMode(enabled) }
                    },
                    onToggleAutoCapture = { enabled ->
                        scope.launch { settingsPreferences.setAutoCapture(enabled) }
                    },
                    onToggleCareAccessibility = { enabled ->
                        scope.launch { settingsPreferences.setCareAccessibility(enabled) }
                    }
                )
            }
        )
        if (careAccessibilityEnabled) {
            add(
                SettingsSection("accessibility", "Care & Accessibility") {
                    AccessibilitySection(
                        fontSize = fontSize,
                        onFontSizeChange = { value ->
                            scope.launch { settingsPreferences.setFontSize(value.coerceIn(80, 200)) }
                        },
                        reducedMotion = reducedMotion,
                        onToggleReducedMotion = { enabled ->
                            scope.launch { settingsPreferences.setReducedMotion(enabled) }
                        },
                        highContrast = highContrast,
                        onToggleHighContrast = { enabled ->
                            scope.launch { settingsPreferences.setHighContrast(enabled) }
                        }
                    )
                }
            )
        }
        add(
            SettingsSection("privacy", "Privacy & Security") {
                PrivacySecuritySection(
                    autoSave = autoSave,
                    onToggleAutoSave = onToggleAutosave
                )
            }
        )
        add(
            SettingsSection("system", "System Information") {
                SystemInfoSection(vaultState = vaultState)
            }
        )
    }

    val sectionIndexMap = remember(sections) {
        sections.mapIndexed { idx, section -> section.id to idx }.toMap()
    }
    val activeSectionId = sections.getOrNull(listState.firstVisibleItemIndex)?.id
    val colors = MaterialTheme.colorScheme

    ModalBottomSheet(
        onDismissRequest = dismissSheet,
        sheetState = sheetState,
        containerColor = colors.surface,
        contentColor = colors.onSurface,
        dragHandle = { SettingsSheetDragHandle() }
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                SettingsSheetHeader(
                    onSections = { navSheetOpen = true },
                    onClose = dismissSheet
                )
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    LazyColumn(
                        state = listState,
                        contentPadding = PaddingValues(top = 6.dp, bottom = 120.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        sections.forEach { section ->
                            item(key = section.id) {
                                section.content()
                            }
                        }
                    }

                    SaveAllButton(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(horizontal = 8.dp, vertical = 8.dp)
                    ) {
                        onSaveSettings(
                            VaultSettingsRecord(
                                memoryDetection = memoryDetection,
                                peopleRecognition = peopleRecognition,
                                dementiaMode = dementiaMode,
                                careAccessibilityEnabled = careAccessibilityEnabled,
                                autoCapture = autoCapture,
                                reducedMotion = reducedMotion,
                                highContrast = highContrast,
                                fontSize = fontSize,
                                autoSaveEnabled = autoSave
                            )
                        )
                        Toast.makeText(context, "Settings saved", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            if (navSheetOpen) {
                SettingsSectionsSheet(
                    sections = sections,
                    activeSectionId = activeSectionId,
                    onDismiss = { navSheetOpen = false },
                    onSectionSelected = { sectionId ->
                        navSheetOpen = false
                        scope.launch {
                            val index = sectionIndexMap[sectionId] ?: 0
                            listState.animateScrollToItem(index)
                        }
                    }
                )
            }
        }
    }

    if (showApiKeyDialog) {
        AlertDialog(
            onDismissRequest = {
                showApiKeyDialog = false
                apiKeyInput = ""
                showApiKey = false
            },
            title = { Text(if (hasApiKey) "Update API Key" else "Set API Key") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextField(
                        value = apiKeyInput,
                        onValueChange = { apiKeyInput = it },
                        label = { Text("OpenAI API Key") },
                        singleLine = true,
                        visualTransformation = if (showApiKey) VisualTransformation.None else PasswordVisualTransformation()
                    )
                    TextButton(onClick = { showApiKey = !showApiKey }) {
                        Text(if (showApiKey) "Hide" else "Show")
                    }
                    Text(
                        "Stored locally on this device.",
                        color = colors.onSurface.copy(alpha = 0.7f),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmed = apiKeyInput.trim()
                        scope.launch {
                            aiPreferences.setOpenAiApiKey(trimmed)
                            Toast.makeText(
                                context,
                                if (trimmed.isBlank()) "API key cleared" else "API key saved",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                        apiKeyInput = ""
                        showApiKey = false
                        showApiKeyDialog = false
                    },
                    enabled = apiKeyInput.isNotBlank()
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (hasApiKey) {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    aiPreferences.setOpenAiApiKey(null)
                                    Toast.makeText(context, "API key removed", Toast.LENGTH_SHORT).show()
                                }
                                apiKeyInput = ""
                                showApiKey = false
                                showApiKeyDialog = false
                            }
                        ) {
                            Text("Remove")
                        }
                    }
                    TextButton(
                        onClick = {
                            showApiKeyDialog = false
                            apiKeyInput = ""
                            showApiKey = false
                        }
                    ) {
                        Text("Cancel")
                    }
                }
            }
        )
    }
}



private data class SettingsSection(
    val id: String,
    val title: String,
    val content: @Composable () -> Unit
)

@Composable
private fun SettingsSheetHeader(
    onSections: () -> Unit,
    onClose: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "Settings",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            Text(
                text = "Themes, privacy, intelligence, and accessibility",
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurface.copy(alpha = 0.72f)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            TopBarActionButton(
                icon = Icons.Filled.Menu,
                description = "Settings sections",
                onClick = onSections
            )
            TopBarActionButton(
                icon = Icons.Filled.Close,
                description = "Close settings",
                onClick = onClose
            )
        }
    }
}

@Composable
private fun SettingsSheetDragHandle() {
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
private fun SettingsSectionsSheet(
    sections: List<SettingsSection>,
    activeSectionId: String?,
    onDismiss: () -> Unit,
    onSectionSelected: (String) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val sheetShape = RoundedCornerShape(26.dp)
    val headerShape = RoundedCornerShape(20.dp)
    val accentBrush = Brush.linearGradient(
        listOf(
            palette.primary.copy(alpha = 0.26f),
            palette.secondary.copy(alpha = 0.26f)
        )
    )
    val scrimBrush = Brush.linearGradient(
        listOf(
            colors.background.copy(alpha = 0.92f),
            palette.primary.copy(alpha = 0.14f),
            palette.secondary.copy(alpha = 0.18f),
            colors.background.copy(alpha = 0.9f)
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(scrimBrush)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable { onDismiss() }
        )
        Card(
            colors = CardDefaults.cardColors(containerColor = colors.surface),
            border = BorderStroke(1.dp, colors.outlineVariant.copy(alpha = 0.6f)),
            shape = sheetShape,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(horizontal = 16.dp, vertical = 18.dp)
                .fillMaxWidth()
                .widthIn(max = 520.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(headerShape)
                        .background(accentBrush)
                        .border(1.dp, colors.onSurface.copy(alpha = 0.08f), headerShape)
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "Settings Sections",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.onSurface
                            )
                            Text(
                                text = "Jump to a section",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurface.copy(alpha = 0.72f)
                            )
                        }
                        SettingsSheetCloseButton(onClick = onDismiss)
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    sections.forEach { section ->
                        SettingsSectionRow(
                            section = section,
                            isActive = section.id == activeSectionId,
                            accentBrush = accentBrush,
                            onClick = { onSectionSelected(section.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsSectionRow(
    section: SettingsSection,
    isActive: Boolean,
    accentBrush: Brush,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val rowShape = RoundedCornerShape(16.dp)
    val elevation by animateFloatAsState(
        targetValue = if (isActive) 8f else 0f,
        animationSpec = tween(durationMillis = 220, easing = FastOutSlowInEasing),
        label = "settingsNavElevation"
    )
    val borderAlpha by animateFloatAsState(
        targetValue = if (isActive) 0.5f else 0.16f,
        animationSpec = tween(durationMillis = 220, easing = FastOutSlowInEasing),
        label = "settingsNavBorder"
    )
    val backgroundModifier = if (isActive) {
        Modifier.background(accentBrush, rowShape)
    } else {
        Modifier.background(colors.surfaceVariant.copy(alpha = 0.6f), rowShape)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation.dp, rowShape, clip = false)
            .clip(rowShape)
            .then(backgroundModifier)
            .border(1.dp, colors.onSurface.copy(alpha = borderAlpha), rowShape)
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .then(
                        if (isActive) {
                            Modifier.background(
                                Brush.linearGradient(
                                    listOf(
                                        colors.primary.copy(alpha = 0.9f),
                                        colors.secondary.copy(alpha = 0.9f)
                                    )
                                )
                            )
                        } else {
                            Modifier.background(colors.onSurface.copy(alpha = 0.18f))
                        }
                    )
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = section.title,
                    color = colors.onSurface,
                    fontWeight = FontWeight.SemiBold
                )
                if (isActive) {
                    Text(
                        text = "Currently viewing",
                        color = colors.onSurface.copy(alpha = 0.7f),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsSheetCloseButton(onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.size(32.dp),
        shape = CircleShape,
        color = colors.surface.copy(alpha = 0.6f),
        border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.2f))
    ) {
        IconButton(onClick = onClick, modifier = Modifier.fillMaxSize()) {
            Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = "Close settings sections",
                tint = colors.onSurface
            )
        }
    }
}

@Composable
private fun SectionContainer(
    iconText: String,
    title: String,
    description: String,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.6f)),
        border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.14f)),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(58.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(
                                palette.primary.copy(alpha = 0.25f),
                                palette.secondary.copy(alpha = 0.22f)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(iconText, color = colors.onSurface, fontWeight = FontWeight.Bold)
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(title, color = colors.onSurface, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(description, color = colors.onSurface.copy(alpha = 0.74f), style = MaterialTheme.typography.bodyMedium)
            }
            content()
        }
    }
}

@Composable
private fun VisualThemesSection(
    themeOptions: List<EmmaPalette>,
    selectedTheme: EmmaPalette,
    onThemeSelected: (String) -> Unit,
    backgroundOptions: List<EmmaBackgroundOption>,
    selectedBackgroundId: String,
    onBackgroundSelected: (String) -> Unit
) {
    SectionContainer(
        iconText = "VT",
        title = "Visual Themes",
        description = "Preview different Emma looks and moods. Themes update instantly so you can find the palette that feels just right, and you can choose a signature background to match."
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            themeOptions.chunked(2).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    row.forEach { option ->
                        ThemeOptionCard(
                            palette = option,
                            isSelected = option.id == selectedTheme.id,
                            onSelect = { onThemeSelected(option.id) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
            BackgroundOptionsList(
                options = backgroundOptions,
                selectedId = selectedBackgroundId,
                onSelect = onBackgroundSelected
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ThemeOptionCard(
    palette: EmmaPalette,
    isSelected: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
        border = BorderStroke(1.dp, if (isSelected) colors.primary else colors.onSurface.copy(alpha = 0.14f)),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onSelect() }
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(86.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                palette.primary.copy(alpha = 0.95f),
                                palette.secondary.copy(alpha = 0.9f)
                            )
                        )
                    )
                    .padding(10.dp)
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    palette.swatches.forEach { color ->
                        Box(
                            modifier = Modifier
                                .size(18.dp)
                                .clip(CircleShape)
                                .background(color)
                                .border(BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.2f)), CircleShape)
                        )
                    }
                }
            }
            Text(palette.name, color = colors.onSurface, fontWeight = FontWeight.SemiBold)
            Text(
                palette.description,
                color = colors.onSurface.copy(alpha = 0.74f),
                style = MaterialTheme.typography.bodySmall
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                palette.tags.forEach { tag ->
                    TagChip(tag)
                }
                if (isSelected) {
                    TagChip("Active", highlight = true)
                }
            }
        }
    }
}

@Composable
private fun TagChip(text: String, highlight: Boolean = false) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (highlight) colors.primary.copy(alpha = 0.22f) else colors.primary.copy(alpha = 0.18f),
                RoundedCornerShape(12.dp)
            )
            .border(
                BorderStroke(1.dp, if (highlight) colors.primary else colors.primary.copy(alpha = 0.8f)),
                RoundedCornerShape(12.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = text,
            color = palette.onSurface,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
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

private fun parseTags(input: String): List<String> {
    return input.split(",", "\n", ";")
        .map { it.trim() }
        .filter { it.isNotBlank() }
}

@Composable
private fun BackgroundOptionsList(
    options: List<EmmaBackgroundOption>,
    selectedId: String,
    onSelect: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        options.forEach { option ->
            BackgroundOptionCard(
                option = option,
                isSelected = option.id == selectedId,
                onSelect = { onSelect(option.id) }
            )
        }
    }
}

@Composable
private fun BackgroundSection(
    options: List<EmmaBackgroundOption>,
    selectedId: String,
    onSelect: (String) -> Unit
) {
    SectionContainer(
        iconText = "BG",
        title = "Background Options",
        description = "Choose a signature background for your theme."
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            options.forEach { option ->
                BackgroundOptionCard(
                    option = option,
                    isSelected = option.id == selectedId,
                    onSelect = { onSelect(option.id) }
                )
            }
        }
    }
}

@Composable
private fun BackgroundOptionCard(
    option: EmmaBackgroundOption,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, if (isSelected) colors.primary else colors.onSurface.copy(alpha = 0.14f)),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect() }
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.linearGradient(option.colors))
                    .border(BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.18f)), RoundedCornerShape(14.dp))
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(option.name, color = colors.onSurface, fontWeight = FontWeight.SemiBold)
                Text(option.description, color = colors.onSurface.copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
            }
            if (isSelected) {
                TagChip("Active", highlight = true)
            }
        }
    }
}

@Composable
private fun IntelligenceSection(
    memoryDetection: Boolean,
    peopleRecognition: Boolean,
    hasApiKey: Boolean,
    apiEnabled: Boolean,
    vaultReady: Boolean,
    onManageApiKey: () -> Unit,
    onToggleApiEnabled: (Boolean) -> Unit,
    onToggleMemory: (Boolean) -> Unit,
    onTogglePeople: (Boolean) -> Unit
) {
    val apiDescription = if (hasApiKey) {
        "OpenAI API key saved on this device."
    } else {
        "Enable Emma's most advanced AI responses with your OpenAI API key."
    }
    val onlineDescription = if (hasApiKey) {
        "Use your API key for online responses and voice."
    } else {
        "Add an API key to enable online responses."
    }
    val apiButtonLabel = if (hasApiKey) "Update API Key" else "Set Up API Key"
    val vectorlessActive = vaultReady && memoryDetection
    val vectorlessStatus = when {
        !vaultReady -> "Vault closed"
        memoryDetection -> "Active"
        else -> "Paused"
    }
    SectionContainer(
        iconText = "AI",
        title = "Artificial Intelligence",
        description = "Emma works beautifully offline with smart heuristics. Connect advanced features like memory and people recognition."
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SettingToggleRow(
                title = "OpenAI API Key",
                description = apiDescription,
                trailing = {
                    OutlinedButton(
                        onClick = onManageApiKey,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface)
                    ) {
                        Text(apiButtonLabel)
                    }
                }
            )
            SettingToggleRow(
                title = "Enable Online AI",
                description = onlineDescription,
                trailing = {
                    Switch(
                        checked = apiEnabled,
                        onCheckedChange = onToggleApiEnabled,
                        enabled = hasApiKey,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingToggleRow(
                title = "Memory Detection",
                description = "Emma recognizes meaningful memories and suggests saving them.",
                trailing = {
                    Switch(
                        checked = memoryDetection,
                        onCheckedChange = onToggleMemory,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingToggleRow(
                title = "People Recognition",
                description = "Identify names in conversations and link to people in your vault.",
                trailing = {
                    Switch(
                        checked = peopleRecognition,
                        onCheckedChange = onTogglePeople,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingStatusRow(
                title = "Vectorless AI Status",
                description = "Real-time status of Emma's intelligent memory processing system.",
                statusText = vectorlessStatus,
                active = vectorlessActive
            )
        }
    }
}

@Composable
private fun MemoryCareSection(
    dementiaMode: Boolean,
    autoCapture: Boolean,
    careAccessibilityEnabled: Boolean,
    onToggleDementia: (Boolean) -> Unit,
    onToggleAutoCapture: (Boolean) -> Unit,
    onToggleCareAccessibility: (Boolean) -> Unit
) {
    SectionContainer(
        iconText = "MC",
        title = "Memory & Care",
        description = "Specialized features for memory preservation and dementia care support."
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SettingToggleRow(
                title = "Enable Dementia Care & Accessibility",
                description = "Show specialized dementia care and accessibility controls in settings.",
                trailing = {
                    Switch(
                        checked = careAccessibilityEnabled,
                        onCheckedChange = onToggleCareAccessibility,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingToggleRow(
                title = "Dementia Care Mode",
                description = "Validation therapy principles and specialized responses.",
                trailing = {
                    Switch(
                        checked = dementiaMode,
                        onCheckedChange = onToggleDementia,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingToggleRow(
                title = "Memory Auto-Capture",
                description = "Automatically detect and suggest capturing meaningful moments.",
                trailing = {
                    Switch(
                        checked = autoCapture,
                        onCheckedChange = onToggleAutoCapture,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
        }
    }
}

@Composable
private fun PrivacySecuritySection(
    autoSave: Boolean,
    onToggleAutoSave: (Boolean) -> Unit
) {
    SectionContainer(
        iconText = "PS",
        title = "Privacy & Security",
        description = "Emma prioritizes your privacy with local-only processing and secure vault encryption."
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SettingStatusRow(
                title = "Local Processing",
                description = "All memory analysis happens on your device.",
                statusText = "Always Enabled",
                active = true
            )
            SettingStatusRow(
                title = "Vault Encryption",
                description = "Your .emma files are protected with AES-256.",
                statusText = "Always Enabled",
                active = true
            )
            SettingToggleRow(
                title = "Vault Auto-Save",
                description = "Automatically write updates to your .emma vault.",
                trailing = {
                    Switch(
                        checked = autoSave,
                        onCheckedChange = onToggleAutoSave,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
        }
    }
}

@Composable
private fun AccessibilitySection(
    fontSize: Int,
    onFontSizeChange: (Int) -> Unit,
    reducedMotion: Boolean,
    onToggleReducedMotion: (Boolean) -> Unit,
    highContrast: Boolean,
    onToggleHighContrast: (Boolean) -> Unit
) {
    SectionContainer(
        iconText = "CA",
        title = "Dementia Care & Accessibility",
        description = "Features designed for users with memory impairment and their caregivers."
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SettingToggleRow(
                title = "Font Size",
                description = "Adjust text size throughout Emma for better readability.",
                trailing = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { onFontSizeChange(fontSize - 5) },
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface)
                        ) { Text("A-") }
                        Text("$fontSize%", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                        OutlinedButton(
                            onClick = { onFontSizeChange(fontSize + 5) },
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface)
                        ) { Text("A+") }
                        OutlinedButton(
                            onClick = { onFontSizeChange(100) },
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface)
                        ) { Text("Reset") }
                    }
                }
            )
            SettingToggleRow(
                title = "Reduced Motion",
                description = "Minimize animations and transitions to reduce disorientation.",
                trailing = {
                    Switch(
                        checked = reducedMotion,
                        onCheckedChange = onToggleReducedMotion,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingToggleRow(
                title = "High Contrast Mode",
                description = "Increase color contrast for better visibility.",
                trailing = {
                    Switch(
                        checked = highContrast,
                        onCheckedChange = onToggleHighContrast,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            )
            SettingStatusRow(
                title = "Gentle Reminders",
                description = "Encouraging language based on validation therapy principles.",
                statusText = "Always Enabled",
                active = true
            )
            SettingStatusRow(
                title = "Repetition Tolerance",
                description = "Handles repeated questions without highlighting repetition.",
                statusText = "Always Enabled",
                active = true
            )
            SettingStatusRow(
                title = "Response Pacing",
                description = "Waits before responding to reduce pressure and allow processing time.",
                statusText = "Always Enabled",
                active = true
            )
        }
    }
}

@Composable
private fun SystemInfoSection(vaultState: VaultState) {
    val vaultStatus = when (vaultState.status) {
        VaultStatus.Ready -> "Ready"
        VaultStatus.Loading -> "Loading"
        VaultStatus.Error -> "Needs Attention"
        VaultStatus.Empty -> "Not Loaded"
    }
    val lastSavedLabel = vaultState.lastSavedAt?.let { savedAt ->
        formatDateTime(Instant.ofEpochMilli(savedAt).toString())
    } ?: "Not yet saved"
    SectionContainer(
        iconText = "SI",
        title = "System Information",
        description = "Basic system information and compatibility status."
    ) {
        SettingStatusRow(
            title = "Emma Version",
            description = "Current version of Emma and compatibility information.",
            statusText = "v1.0 Beta",
            active = true
        )
        SettingStatusRow(
            title = "Vault Status",
            description = "Current vault readiness and connection state.",
            statusText = vaultStatus,
            active = vaultState.status == VaultStatus.Ready
        )
        SettingStatusRow(
            title = "Storage Access",
            description = "Persisted permission to read and write the active vault.",
            statusText = if (vaultState.hasPersistedPermission) "Persisted" else "Needs Refresh",
            active = vaultState.hasPersistedPermission
        )
        SettingStatusRow(
            title = "Last Vault Save",
            description = "Most recent successful write to the vault file.",
            statusText = lastSavedLabel,
            active = vaultState.lastSavedAt != null
        )
    }
}

@Composable
private fun SettingToggleRow(
    title: String,
    description: String,
    trailing: @Composable () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(title, color = colors.onSurface, fontWeight = FontWeight.SemiBold)
            Text(description, color = colors.onSurface.copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
        }
        Spacer(modifier = Modifier.size(12.dp))
        trailing()
    }
}

@Composable
private fun SettingStatusRow(
    title: String,
    description: String,
    statusText: String,
    active: Boolean
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(title, color = colors.onSurface, fontWeight = FontWeight.SemiBold)
            Text(description, color = colors.onSurface.copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
        }
        Spacer(modifier = Modifier.size(12.dp))
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(colors.onSurface.copy(alpha = 0.08f))
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(if (active) colors.primary else colors.onSurface.copy(alpha = 0.5f))
            )
            Text(statusText, color = colors.onSurface, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun SaveAllButton(onClick: () -> Unit) {
    SaveAllButton(modifier = Modifier.fillMaxWidth(), onClick = onClick)
}

@Composable
private fun SaveAllButton(
    modifier: Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .clip(RoundedCornerShape(50)),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
        contentPadding = PaddingValues()
    ) {
        val palette = LocalEmmaPalette.current
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(listOf(palette.primary, palette.secondary)),
                    shape = RoundedCornerShape(50)
                )
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                "Save All Settings",
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun QaChecksCard(
    vaultState: VaultState,
    voiceState: VoiceSessionState,
    resumeStatus: VaultResumeStatus?,
    cryptoStatus: VaultCryptoStatus?,
    voiceStatus: VoiceConnectivityResult?,
    isRunning: Boolean,
    onRunResume: () -> Unit,
    onRunCrypto: () -> Unit,
    onRunVoice: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.62f)),
        border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.14f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("QA / Smoke Checks", color = colors.onSurface, fontWeight = FontWeight.SemiBold)
            Button(
                onClick = onRunResume,
                enabled = !isRunning,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary.copy(alpha = 0.16f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Resume (SAF + autosave)", color = colors.onPrimary)
            }
            resumeStatus?.let { status ->
                Text(
                    text = "Autosave: ${if (status.hasAutosave) "available" else "missing"}",
                    color = colors.onSurface.copy(alpha = 0.78f),
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Last vault: ${status.lastVaultName ?: "unknown"}",
                    color = colors.onSurface.copy(alpha = 0.78f),
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Permission: " + when {
                        status.hasPersistedPermission -> "persisted"
                        status.needsPermission -> "needs reselect"
                        else -> "none"
                    },
                    color = colors.onSurface.copy(alpha = 0.78f),
                    style = MaterialTheme.typography.bodySmall
                )
            }

            HorizontalDivider(color = colors.onSurface.copy(alpha = 0.14f))

            Button(
                onClick = onRunCrypto,
                enabled = !isRunning,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary.copy(alpha = 0.16f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Decrypt/encrypt parity", color = colors.onPrimary)
            }
            cryptoStatus?.let { status ->
                Text(
                    text = "Parity: ${if (status.ok) "ok" else "failed"}${status.message?.let { ": $it" } ?: ""}",
                    color = if (status.ok) colors.primary else colors.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            HorizontalDivider(color = colors.onSurface.copy(alpha = 0.14f))

            Button(
                onClick = onRunVoice,
                enabled = !isRunning,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary.copy(alpha = 0.16f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Mic / WS connectivity", color = colors.onPrimary)
            }
            voiceStatus?.let { status ->
                Text(
                    text = "API ${if (status.apiOk) "ok" else "fail"} | WS ${if (status.wsOk) "ok" else "fail"}",
                    color = if (status.ok) colors.primary else colors.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            HorizontalDivider(color = colors.onSurface.copy(alpha = 0.14f))

            Text(
                text = "Vault: ${vaultState.vaultName ?: "none"}",
                color = colors.onSurface.copy(alpha = 0.78f),
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                text = "Voice: ${if (voiceState.isConnected) "connected" else if (voiceState.isConnecting) "connecting" else "offline"}",
                color = colors.onSurface.copy(alpha = 0.78f),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

private fun String.toReadableDate(): String {

    return runCatching {

        val instant = Instant.parse(this)

        DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a")

            .withZone(ZoneId.systemDefault())

            .format(instant)

    }.getOrDefault(this)

}

private fun formatDate(iso: String): String {
    return runCatching {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    }.getOrDefault(iso)
}

private fun formatDateTime(iso: String): String {
    return runCatching {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    }.getOrDefault(iso)
}



private fun Long.toReadableDateTime(): String {

    return runCatching {

        DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a")

            .withZone(ZoneId.systemDefault())

            .format(Instant.ofEpochMilli(this))

    }.getOrDefault("recently")

}

private fun buildVaultKey(state: VaultState): String {
    val source = state.activeUri?.toString()
        ?: state.lastOpenedUri?.toString()
        ?: state.vaultName
        ?: "default"
    val hash = source.hashCode().toLong()
    val normalized = if (hash < 0) -hash else hash
    return normalized.toString()
}
