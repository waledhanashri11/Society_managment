package com.example.application.ui.screens.legal

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private data class LegalSection(val title: String, val body: String)

private val privacySections = listOf(
    LegalSection("1. Information We Collect", "We collect information that you directly provide when registering an account, updating your profile, or using society services. This includes your name, phone number, email address, flat allotment, ownership details, and billing transaction history."),
    LegalSection("2. How We Use Your Information", "We use this information to generate and manage maintenance invoices, verify flat allotments, prevent unauthorized access, manage complaints, and send announcements, billing reminders, and receipts."),
    LegalSection("3. Data Protection & Security", "We use secure connections, encryption methods, and role-based access controls to protect credentials and payment history against unauthorized access, modification, or exposure."),
    LegalSection("4. Third-Party Sharing", "Community Hive does not sell, lease, or distribute resident directories or transaction records to advertising companies. Records are shared only when required to complete an authorized society action."),
    LegalSection("5. Resident Rights & Controls", "Residents may inspect their profile, maintenance invoice history, and accounting receipts. Contact the society administrator to correct inaccurate flat allotment or profile details.")
)

private val termsSections = listOf(
    LegalSection("1. Acceptable Use of the Portal", "By accessing Community Hive, you agree to provide authentic registration details, match your profile to your verified flat number, and use the app only for lawful community operations."),
    LegalSection("2. Resident Accounts & Responsibilities", "You are responsible for securing your password and for activity performed through your account, including payment-proof uploads and community posts. Report unauthorized access to the society committee immediately."),
    LegalSection("3. Maintenance Billing & Penalties", "Invoices are generated according to rules configured by the society administrator. Late fees and interest may apply after the configured grace period expires."),
    LegalSection("4. Disclaimers & Liabilities", "Community Hive is provided on an as-is basis. Society financial disputes, cash handling, cheque defaults, and individual billing disputes must be resolved with the society committee or treasury board."),
    LegalSection("5. Service Adjustments", "The service may receive updates, interface changes, or temporary maintenance interruptions. Resident access remains subject to society registration and account status.")
)

private val refundSections = listOf(
    LegalSection("1. Maintenance Payments Settlement", "Maintenance billing is governed by the housing society committee. Payments go to the society account; Community Hive does not hold or directly process payment refunds."),
    LegalSection("2. Erroneous Transactions & Double Payments", "Keep transaction IDs and payment proof and present them to the society treasurer. An approved duplicate payment may be adjusted against a future billing cycle."),
    LegalSection("3. Dispute Timelines", "Report incorrect bills, penalties, or adjustments to the society office within 15 days of bill generation. Approved adjustments are credited to the resident account."),
    LegalSection("4. Non-Refundable Items", "Administrative processing fees, service charges, correctly applied late penalties, and active gate-pass utility deposits are non-refundable.")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LegalInformationScreen(initialSection: String, onBack: () -> Unit) {
    val tabs = listOf("privacy" to "Privacy Policy", "terms" to "Terms of Service", "refunds" to "Refund Rules")
    var selected by remember(initialSection) { mutableStateOf(tabs.indexOfFirst { it.first == initialSection }.coerceAtLeast(0)) }
    val sections = when (tabs[selected].first) {
        "terms" -> termsSections
        "refunds" -> refundSections
        else -> privacySections
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(tabs[selected].second, fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                ScrollableTabRow(selectedTabIndex = selected, edgePadding = 0.dp) {
                    tabs.forEachIndexed { index, tab -> Tab(selected = selected == index, onClick = { selected = index }, text = { Text(tab.second) }) }
                }
            }
            item { Text("Last updated: July 10, 2026", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(sections.size) { index ->
                val section = sections[index]
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(section.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(section.body, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
