package com.example.application.ui.screens.resident.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CurrencyRupee
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ResidentBottomNavigation(
    selectedRoute: String = "Home",
    onSelectRoute: (String) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 12.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(64.dp)
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. Home
            BottomNavItem(
                label = "Home",
                icon = Icons.Filled.Home,
                isSelected = selectedRoute == "Home",
                onClick = { onSelectRoute("Home") }
            )

            // 2. Maintenance
            BottomNavItem(
                label = "Maintenance",
                icon = Icons.Filled.AccountBalanceWallet,
                isSelected = selectedRoute == "Maintenance",
                onClick = { onSelectRoute("Maintenance") }
            )

            // 3. Center Highlighted "Pay" Action Button
            Box(
                modifier = Modifier
                    .offset(y = (-6).dp)
                    .clip(CircleShape)
                    .clickable { onSelectRoute("Pay") },
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFF2563EB),
                    shadowElevation = 6.dp,
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.CurrencyRupee,
                            contentDescription = "Pay",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }

            // 4. Notices
            BottomNavItem(
                label = "Notices",
                icon = Icons.Filled.Campaign,
                isSelected = selectedRoute == "Notices",
                onClick = { onSelectRoute("Notices") }
            )

            // 5. More
            BottomNavItem(
                label = "More",
                icon = Icons.Filled.GridView,
                isSelected = selectedRoute == "More",
                onClick = { onSelectRoute("More") }
            )
        }
    }
}

@Composable
private fun BottomNavItem(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val activeColor = Color(0xFF2563EB)
    val inactiveColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)

    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected) activeColor else inactiveColor,
            modifier = Modifier.size(22.dp)
        )

        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
            color = if (isSelected) activeColor else inactiveColor,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
        )
    }
}
