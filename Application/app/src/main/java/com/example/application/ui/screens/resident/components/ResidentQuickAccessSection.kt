package com.example.application.ui.screens.resident.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CurrencyRupee
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.SensorDoor
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class QuickAccessModule(
    val title: String,
    val icon: ImageVector,
    val color: Color,
    val route: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentQuickAccessSection(
    onQuickAction: (String) -> Unit
) {
    var showMoreBottomSheet by remember { mutableStateOf(false) }

    val mainItems = remember {
        listOf(
            QuickAccessModule("Maintenance", Icons.Filled.AccountBalanceWallet, Color(0xFF2563EB), "Maintenance"),
            QuickAccessModule("Payments", Icons.Filled.CurrencyRupee, Color(0xFF16A34A), "Payment History"),
            QuickAccessModule("Reports", Icons.Filled.Description, Color(0xFF9333EA), "Reports"),
            QuickAccessModule("Notices", Icons.Filled.Campaign, Color(0xFF0D9488), "Notices"),
            QuickAccessModule("More", Icons.Filled.GridView, Color(0xFF64748B), "MORE_SHEET")
        )
    }

    val moreModules = remember {
        listOf(
            QuickAccessModule("Complaints", Icons.Filled.ReportProblem, Color(0xFFEA580C), "My Complaints"),
            QuickAccessModule("Meetings", Icons.Filled.Event, Color(0xFF2563EB), "Meeting Management"),
            QuickAccessModule("Society Rules", Icons.Filled.TaskAlt, Color(0xFF16A34A), "Society Rules"),
            QuickAccessModule("NOC Requests", Icons.Filled.SensorDoor, Color(0xFFDB2777), "NOC Requests"),
            QuickAccessModule("Members", Icons.Filled.Groups, Color(0xFF4F46E5), "Members"),
            QuickAccessModule("Notifications", Icons.Filled.Notifications, Color(0xFFD97706), "Notifications"),
            QuickAccessModule("Events", Icons.Filled.Event, Color(0xFF0284C7), "Events"),
            QuickAccessModule("Payment History", Icons.Filled.History, Color(0xFF059669), "Payment History"),
            QuickAccessModule("Profile", Icons.Filled.Person, Color(0xFF475569), "PROFILE")
        )
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Title Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Quick Access",
                style = MaterialTheme.typography.titleMedium.copy(fontSize = 16.sp),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { showMoreBottomSheet = true }
                    .padding(horizontal = 6.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "Edit",
                    style = MaterialTheme.typography.labelMedium.copy(fontSize = 12.sp),
                    color = Color(0xFF2563EB),
                    fontWeight = FontWeight.Bold
                )
                Icon(
                    imageVector = Icons.Filled.Edit,
                    contentDescription = "Edit",
                    tint = Color(0xFF2563EB),
                    modifier = Modifier.size(12.dp)
                )
            }
        }

        // Horizontal Row of 5 Compact Items
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            mainItems.forEach { module ->
                QuickAccessItemCard(
                    modifier = Modifier.weight(1f),
                    title = module.title,
                    icon = module.icon,
                    accentColor = module.color,
                    onClick = {
                        if (module.route == "MORE_SHEET") {
                            showMoreBottomSheet = true
                        } else {
                            onQuickAction(module.route)
                        }
                    }
                )
            }
        }
    }

    // Modal Bottom Sheet for "More" Menu
    if (showMoreBottomSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showMoreBottomSheet = false },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "All Resident Services",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }

                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.padding(bottom = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(moreModules) { module ->
                        Surface(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .clickable {
                                    showMoreBottomSheet = false
                                    if (module.route == "PROFILE") {
                                        onQuickAction("PROFILE_SCREEN")
                                    } else {
                                        onQuickAction(module.route)
                                    }
                                },
                            shape = RoundedCornerShape(16.dp),
                            color = module.color.copy(alpha = 0.08f)
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(module.color.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = module.icon,
                                        contentDescription = module.title,
                                        tint = module.color,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                                Text(
                                    text = module.title,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickAccessItemCard(
    modifier: Modifier = Modifier,
    title: String,
    icon: ImageVector,
    accentColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 12.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(accentColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = accentColor,
                    modifier = Modifier.size(20.dp)
                )
            }

            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
