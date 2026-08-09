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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CurrencyRupee
import androidx.compose.material.icons.filled.PriorityHigh
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ResidentSummaryCards(
    totalDueText: String,
    pendingBillsCount: Int,
    totalPaidText: String,
    paidBillsCount: Int,
    openComplaintsCount: Int,
    approvedComplaintsCount: Int,
    onTotalDueClick: () -> Unit = {},
    onPaidClick: () -> Unit = {},
    onComplaintsClick: () -> Unit = {},
    onApprovedClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Card 1: Total Due (Blue)
        SummaryItemCard(
            modifier = Modifier.weight(1f),
            title = "Total Due",
            valueText = totalDueText,
            subtext = if (pendingBillsCount == 1) "1 pending bill" else "$pendingBillsCount pending bills",
            icon = Icons.Filled.CurrencyRupee,
            accentColor = Color(0xFF2563EB),
            backgroundColor = Color(0xFFEFF6FF),
            onClick = onTotalDueClick
        )

        // Card 2: Paid (Green)
        SummaryItemCard(
            modifier = Modifier.weight(1f),
            title = "Paid",
            valueText = totalPaidText,
            subtext = "$paidBillsCount paid",
            icon = Icons.Filled.CheckCircle,
            accentColor = Color(0xFF16A34A),
            backgroundColor = Color(0xFFF0FDF4),
            onClick = onPaidClick
        )

        // Card 3: Complaints (Orange)
        SummaryItemCard(
            modifier = Modifier.weight(1f),
            title = "Complaints",
            valueText = openComplaintsCount.toString(),
            subtext = "Open",
            icon = Icons.Filled.PriorityHigh,
            accentColor = Color(0xFFEA580C),
            backgroundColor = Color(0xFFFFF7ED),
            onClick = onComplaintsClick
        )

        // Card 4: Approved (Purple)
        SummaryItemCard(
            modifier = Modifier.weight(1f),
            title = "Approved",
            valueText = approvedComplaintsCount.toString(),
            subtext = "Complaints",
            icon = Icons.Filled.VerifiedUser,
            accentColor = Color(0xFF9333EA),
            backgroundColor = Color(0xFFFAF5FF),
            onClick = onApprovedClick
        )
    }
}

@Composable
private fun SummaryItemCard(
    modifier: Modifier = Modifier,
    title: String,
    valueText: String,
    subtext: String,
    icon: ImageVector,
    accentColor: Color,
    backgroundColor: Color,
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
            modifier = Modifier
                .padding(vertical = 12.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Circle Icon
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(backgroundColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = accentColor,
                    modifier = Modifier.size(18.dp)
                )
            }

            // Title
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Value
            Text(
                text = valueText,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 15.sp,
                    lineHeight = 18.sp
                ),
                color = accentColor,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )

            // Subtext
            Text(
                text = subtext,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )
        }
    }
}
