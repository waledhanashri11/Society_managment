package com.example.application.ui.screens.resident.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.application.R

@Composable
fun ResidentHeroCard(
    amountText: String,
    dueDateText: String,
    onPayNowClick: () -> Unit,
    onMenuClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF2563EB), // Bright Royal Blue
                            Color(0xFF1D4ED8), // Deep Blue
                            Color(0xFF1E3A8A)  // Dark Navy Blue
                        )
                    )
                )
                .padding(20.dp)
        ) {
            // Background Building Illustration Graphic on the right side
            Image(
                painter = painterResource(id = R.drawable.ic_building_illustration),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(width = 160.dp, height = 130.dp)
                    .padding(top = 10.dp),
                alpha = 0.85f
            )

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Top Row: Title + 3 Dots Menu
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Total Amount Due",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.White.copy(alpha = 0.9f),
                        fontWeight = FontWeight.Medium
                    )

                    IconButton(
                        onClick = onMenuClick,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.MoreHoriz,
                            contentDescription = "Options",
                            tint = Color.White
                        )
                    }
                }

                // Amount
                Text(
                    text = amountText,
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontSize = 34.sp,
                        letterSpacing = (-0.5).sp
                    ),
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold
                )

                // Due Date
                Text(
                    text = if (dueDateText.startsWith("Due Date:")) dueDateText else "Due Date: $dueDateText",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.85f)
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Pay Now Button (White Pill with Icon & Blue Arrow)
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .clickable { onPayNowClick() },
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.AccountBalanceWallet,
                            contentDescription = null,
                            tint = Color(0xFF2563EB),
                            modifier = Modifier.size(18.dp)
                        )

                        Text(
                            text = "Pay Now",
                            style = MaterialTheme.typography.labelLarge,
                            color = Color(0xFF1E3A8A),
                            fontWeight = FontWeight.Bold
                        )

                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForwardIos,
                            contentDescription = null,
                            tint = Color(0xFF2563EB),
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }
        }
    }
}
