package com.example.application.ui.screens.resident.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.PendingActions
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ResidentComplaintTrackerCard(
    openCount: Int,
    inProgressCount: Int,
    resolvedCount: Int,
    onTrackAllClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .clickable { onTrackAllClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header Row: [Warning Icon] Title, Track All >
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFEA580C)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Warning,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Text(
                        text = "Complaint Activity Tracker",
                        style = MaterialTheme.typography.titleMedium.copy(fontSize = 15.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Text(
                    text = "Track All >",
                    style = MaterialTheme.typography.labelMedium.copy(fontSize = 13.sp),
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF2563EB),
                    maxLines = 1
                )
            }

            // 3 Status Pills Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatusPillItem(
                    modifier = Modifier.weight(1f),
                    count = openCount,
                    label = "Open",
                    icon = Icons.Filled.FolderOpen,
                    accentColor = Color(0xFFEA580C),
                    bgColor = Color(0xFFFFF7ED)
                )

                StatusPillItem(
                    modifier = Modifier.weight(1f),
                    count = inProgressCount,
                    label = "In Progress",
                    icon = Icons.Filled.PendingActions,
                    accentColor = Color(0xFF2563EB),
                    bgColor = Color(0xFFEFF6FF)
                )

                StatusPillItem(
                    modifier = Modifier.weight(1f),
                    count = resolvedCount,
                    label = "Resolved",
                    icon = Icons.Filled.CheckCircle,
                    accentColor = Color(0xFF16A34A),
                    bgColor = Color(0xFFF0FDF4)
                )
            }
        }
    }
}

@Composable
private fun StatusPillItem(
    modifier: Modifier = Modifier,
    count: Int,
    label: String,
    icon: ImageVector,
    accentColor: Color,
    bgColor: Color
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = bgColor
    ) {
        Row(
            modifier = Modifier
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = accentColor,
                modifier = Modifier.size(18.dp)
            )

            Row(
                modifier = Modifier.padding(start = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = count.toString(),
                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 15.sp),
                    fontWeight = FontWeight.ExtraBold,
                    color = accentColor
                )

                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                    color = accentColor,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
