package com.yourorg.emma.nativeapp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.vault.VaultState
import com.yourorg.emma.nativeapp.vault.VaultStatus
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultControlPanelDialog(
    vaultState: VaultState,
    onClose: () -> Unit,
    onOpenVault: () -> Unit,
    onCreateVault: () -> Unit,
    onExport: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
    onLock: () -> Unit,
    onToggleAutosave: (Boolean) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showLockConfirm by remember { mutableStateOf(false) }
    val isReady = vaultState.status == VaultStatus.Ready
    var now by remember { mutableStateOf(System.currentTimeMillis()) }

    LaunchedEffect(vaultState.lastSavedAt, vaultState.lastOpenedAt) {
        now = System.currentTimeMillis()
    }
    LaunchedEffect(Unit) {
        while (true) {
            delay(60_000)
            now = System.currentTimeMillis()
        }
    }

    val (statusLabel, statusColor, defaultDetail) = when (vaultState.status) {
        VaultStatus.Ready -> if (vaultState.isDirty) {
            Triple("Unsaved changes", palette.secondary, "Save to sync your vault")
        } else {
            Triple("Synced", palette.primary, "All changes saved")
        }
        VaultStatus.Loading -> Triple("Loading", palette.secondary, "Preparing your vault")
        VaultStatus.Error -> Triple("Vault error", colors.error, "Check your vault connection")
        VaultStatus.Empty -> Triple("No vault", colors.onSurface.copy(alpha = 0.7f), "Open or create a vault to begin")
    }

    val statusMessage = when {
        vaultState.status == VaultStatus.Error -> vaultState.error ?: defaultDetail
        !vaultState.message.isNullOrBlank() -> vaultState.message ?: defaultDetail
        else -> defaultDetail
    }

    ModalBottomSheet(
        onDismissRequest = onClose,
        sheetState = sheetState,
        containerColor = colors.surface,
        contentColor = colors.onSurface,
        dragHandle = { SheetDragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            VaultPanelHeader(
                title = "Vault control",
                subtitle = "Access, security, and backups",
                onClose = onClose
            )

            VaultSummaryCard(
                vaultName = vaultState.vaultName ?: "No vault connected",
                statusLabel = statusLabel,
                statusColor = statusColor,
                statusMessage = statusMessage,
                lastSavedAt = vaultState.lastSavedAt,
                lastOpenedAt = vaultState.lastOpenedAt,
                now = now
            )

            if (vaultState.status == VaultStatus.Error && !vaultState.error.isNullOrBlank()) {
                VaultErrorBanner(message = vaultState.error ?: "Vault error")
            }

            VaultStatsRow(
                memoryCount = vaultState.payload?.stats?.memoryCount ?: 0,
                peopleCount = vaultState.payload?.stats?.peopleCount ?: 0,
                autosaveStatus = if (vaultState.autosaveEnabled) "On" else "Off"
            )

            VaultPanelSection(
                title = "Vault access",
                subtitle = "Open or create an encrypted vault on this device."
            ) {
                VaultActionButton(
                    icon = Icons.Filled.LockOpen,
                    title = "Open vault",
                    subtitle = "Select an existing .emma file.",
                    primary = true,
                    onClick = onOpenVault
                )
                VaultActionButton(
                    icon = Icons.Filled.Add,
                    title = "Create new vault",
                    subtitle = "Start a fresh vault on this device.",
                    primary = false,
                    onClick = onCreateVault
                )
            }

            VaultPanelSection(
                title = "Security",
                subtitle = "Sign out of the active vault on this device."
            ) {
                Button(
                    onClick = { showLockConfirm = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.errorContainer,
                        contentColor = colors.onErrorContainer
                    ),
                    shape = RoundedCornerShape(16.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Icon(Icons.Filled.Lock, contentDescription = null)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Lock vault", fontWeight = FontWeight.SemiBold)
                }
                Text(
                    text = "Locking clears the passphrase and closes the active vault.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.72f)
                )
            }

            VaultPanelSection(
                title = "Autosave",
                subtitle = "Keep a local, encrypted backup as you work."
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = if (vaultState.autosaveEnabled) "Autosave enabled" else "Autosave disabled",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        val autosaveHint = if (vaultState.hasAutosave) {
                            "An autosave file is available on this device."
                        } else {
                            "No autosave saved yet."
                        }
                        Text(
                            text = autosaveHint,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurface.copy(alpha = 0.72f)
                        )
                    }
                    Switch(
                        checked = vaultState.autosaveEnabled,
                        onCheckedChange = onToggleAutosave
                    )
                }
            }

            VaultPanelSection(
                title = "Utilities",
                subtitle = "Secondary access to the top bar actions."
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    VaultUtilityButton(
                        icon = Icons.Filled.Save,
                        label = "Save",
                        enabled = isReady,
                        onClick = onSave,
                        modifier = Modifier.weight(1f)
                    )
                    VaultUtilityButton(
                        icon = Icons.Filled.CloudUpload,
                        label = "Download",
                        enabled = isReady,
                        onClick = onExport,
                        modifier = Modifier.weight(1f)
                    )
                    VaultUtilityButton(
                        icon = Icons.Filled.Share,
                        label = "Share",
                        enabled = isReady,
                        onClick = onShare,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    if (showLockConfirm) {
        AlertDialog(
            onDismissRequest = { showLockConfirm = false },
            title = { Text("Lock vault?") },
            text = { Text("This closes the vault and clears the cached passphrase. You will need it to reopen the vault.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLockConfirm = false
                        onLock()
                    }
                ) {
                    Text("Lock")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLockConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
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
private fun VaultPanelHeader(
    title: String,
    subtitle: String,
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
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurface.copy(alpha = 0.72f)
            )
        }
        IconButton(onClick = onClose) {
            Icon(Icons.Filled.Close, contentDescription = "Close")
        }
    }
}

@Composable
private fun VaultSummaryCard(
    vaultName: String,
    statusLabel: String,
    statusColor: Color,
    statusMessage: String,
    lastSavedAt: Long?,
    lastOpenedAt: Long?,
    now: Long
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val cardColor = palette.cardColor ?: colors.surface.copy(alpha = 0.95f)
    Surface(
        shape = RoundedCornerShape(22.dp),
        color = cardColor,
        tonalElevation = 6.dp,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.22f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            palette.primary.copy(alpha = 0.18f),
                            palette.secondary.copy(alpha = 0.12f),
                            Color.Transparent
                        )
                    )
                )
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = vaultName,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            VaultStatusPill(label = statusLabel, color = statusColor)
            if (statusMessage.isNotBlank()) {
                Text(
                    text = statusMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurface.copy(alpha = 0.75f)
                )
            }
            if (lastSavedAt != null || lastOpenedAt != null) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    lastSavedAt?.let {
                        VaultTimestampRow(label = "Last saved", value = formatRelativeTime(it, now))
                    }
                    lastOpenedAt?.let {
                        VaultTimestampRow(label = "Last opened", value = formatRelativeTime(it, now))
                    }
                }
            }
        }
    }
}

@Composable
private fun VaultTimestampRow(label: String, value: String) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = colors.onSurface.copy(alpha = 0.7f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = colors.onSurface
        )
    }
}

@Composable
private fun VaultStatsRow(
    memoryCount: Int,
    peopleCount: Int,
    autosaveStatus: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        VaultStatBadge(
            label = "Memories",
            value = memoryCount.toString(),
            modifier = Modifier.weight(1f)
        )
        VaultStatBadge(
            label = "People",
            value = peopleCount.toString(),
            modifier = Modifier.weight(1f)
        )
        VaultStatBadge(
            label = "Autosave",
            value = autosaveStatus,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun VaultStatBadge(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = colors.surface.copy(alpha = 0.7f),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.16f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = colors.onSurface.copy(alpha = 0.7f)
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
        }
    }
}

@Composable
private fun VaultPanelSection(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val cardColor = palette.cardColor ?: colors.surface.copy(alpha = 0.95f)
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = cardColor,
        tonalElevation = 6.dp,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.18f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurface.copy(alpha = 0.72f)
            )
            content()
        }
    }
}

@Composable
private fun VaultActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    primary: Boolean,
    onClick: () -> Unit,
    enabled: Boolean = true
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val titleColor = if (primary) colors.onPrimary else colors.onSurface
    val subtitleColor = if (primary) colors.onPrimary.copy(alpha = 0.75f) else colors.onSurface.copy(alpha = 0.72f)
    val iconTint = if (primary) colors.onPrimary else palette.primary
    val iconSurface = if (primary) colors.onPrimary.copy(alpha = 0.18f) else palette.primary.copy(alpha = 0.18f)

    val content: @Composable () -> Unit = {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = iconSurface
            ) {
                Box(
                    modifier = Modifier.size(36.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = iconTint)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = titleColor
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = subtitleColor
                )
            }
        }
    }

    if (primary) {
        Button(
            onClick = onClick,
            enabled = enabled,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = palette.primary,
                contentColor = colors.onPrimary
            ),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
        ) {
            content()
        }
    } else {
        OutlinedButton(
            onClick = onClick,
            enabled = enabled,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.25f)),
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = colors.surface.copy(alpha = 0.65f),
                contentColor = colors.onSurface,
                disabledContainerColor = colors.surface.copy(alpha = 0.4f),
                disabledContentColor = colors.onSurface.copy(alpha = 0.4f)
            ),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
        ) {
            content()
        }
    }
}

@Composable
private fun VaultUtilityButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 76.dp),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.22f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = colors.surface.copy(alpha = 0.55f),
            contentColor = colors.onSurface,
            disabledContainerColor = colors.surface.copy(alpha = 0.35f),
            disabledContentColor = colors.onSurface.copy(alpha = 0.35f)
        ),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(icon, contentDescription = null)
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun VaultStatusPill(label: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(color.copy(alpha = 0.18f))
            .border(BorderStroke(1.dp, color.copy(alpha = 0.4f)), RoundedCornerShape(999.dp))
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
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun VaultErrorBanner(message: String) {
    val colors = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = colors.errorContainer,
        border = BorderStroke(1.dp, colors.error.copy(alpha = 0.4f))
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            style = MaterialTheme.typography.bodySmall,
            color = colors.onErrorContainer
        )
    }
}

private fun formatRelativeTime(epochMillis: Long, now: Long): String {
    val delta = (now - epochMillis).coerceAtLeast(0L)
    val minutes = delta / 60_000
    if (minutes < 1) return "just now"
    if (minutes < 60) return "${minutes}m ago"
    val hours = minutes / 60
    if (hours < 24) return "${hours}h ago"
    val days = hours / 24
    if (days < 7) return "${days}d ago"
    return formatAbsoluteDateTime(epochMillis)
}

private fun formatAbsoluteDateTime(epochMillis: Long): String {
    return DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a")
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(epochMillis))
}
