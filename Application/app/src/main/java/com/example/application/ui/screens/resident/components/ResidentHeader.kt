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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.application.R
import com.example.application.ui.components.NotificationDropdown
import com.example.application.ui.components.SocietyIdentityHeader

@Composable
fun ResidentHeader(
    residentName: String?,
    societyName: String?,
    societyLogoUrl: String?,
    onProfileClick: () -> Unit,
    onNotificationClick: () -> Unit
) {
    val currentHour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    val greetingText = when (currentHour) {
        in 4..11 -> stringResource(R.string.greeting_good_morning)
        in 12..16 -> stringResource(R.string.greeting_good_afternoon)
        else -> stringResource(R.string.greeting_good_evening)
    }
    
    val displayName = residentName?.takeIf { it.isNotBlank() } ?: "Resident"
    val initialChar = displayName.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "R"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "$greetingText,",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "👋",
                    fontSize = 14.sp
                )
            }
            Text(
                text = displayName,
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontSize = 22.sp,
                    lineHeight = 28.sp
                ),
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            SocietyIdentityHeader(
                societyName = societyName?.takeIf { it.isNotBlank() } ?: stringResource(R.string.welcome_to_society),
                societyLogoUrl = societyLogoUrl,
                portalLabel = "Resident Portal",
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            NotificationDropdown(
                tint = MaterialTheme.colorScheme.onSurface,
                onViewAll = onNotificationClick
            )

            Surface(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .clickable { onProfileClick() },
                shape = CircleShape,
                color = Color(0xFFDBEAFE) // Light blue avatar background matching reference
            ) {
                Box(
                    modifier = Modifier.clip(CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initialChar,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1D4ED8)
                    )
                }
            }
        }
    }
}
