package com.example.application.ui.components

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.example.application.R

@Composable
fun localizedPaymentStatus(status: String?): String {
    return when (status.normalizeStatus()) {
        "PAID", "APPROVED", "VERIFIED" -> stringResource(R.string.status_paid)
        "PENDING" -> stringResource(R.string.status_pending)
        "UNPAID" -> stringResource(R.string.status_unpaid)
        "PENDING_REVIEW", "PENDING_VERIFICATION", "PAYMENT_PROOF_SUBMITTED", "UNDER_REVIEW" -> stringResource(R.string.status_verification_pending)
        "NEEDS_CLARIFICATION", "CLARIFICATION_REQUIRED" -> stringResource(R.string.status_clarification_required)
        "REJECTED", "DECLINED" -> stringResource(R.string.status_rejected)
        "OVERDUE" -> stringResource(R.string.status_overdue)
        "PARTIAL", "PARTIALLY_PAID" -> stringResource(R.string.status_partially_paid)
        "WRITTEN_OFF", "WRITE_OFF", "SETTLED" -> stringResource(R.string.status_written_off)
        else -> status.orEmpty()
    }
}

@Composable
fun localizedLabel(label: String): String {
    val resId = labelResource(label) ?: return label
    return stringResource(resId)
}

@StringRes
fun labelResource(label: String): Int? {
    return when (label.trim().lowercase()) {
        "dashboard" -> R.string.dashboard
        "home" -> R.string.home
        "residents" -> R.string.residents
        "flats" -> R.string.flats
        "maintenance" -> R.string.maintenance
        "payments" -> R.string.payments
        "payment history" -> R.string.payment_history
        "payment verification" -> R.string.payment_verification
        "payment reviews" -> R.string.payment_reviews
        "dues & payments" -> R.string.dues_payments
        "complaints", "my complaints" -> R.string.complaints
        "notices" -> R.string.notices
        "reports" -> R.string.reports
        "noc", "noc requests" -> R.string.noc_requests
        "members", "society members" -> R.string.society_members
        "rules", "society rules" -> R.string.rules_resident_title
        "meetings", "meeting management" -> R.string.meeting_management
        "staff" -> R.string.staff
        "settings" -> R.string.settings
        "more" -> R.string.more
        "profile" -> R.string.profile
        "logout" -> R.string.logout
        "admin" -> R.string.admin
        "resident" -> R.string.resident
        else -> null
    }
}

private fun String?.normalizeStatus(): String {
    return orEmpty().trim().replace("-", "_").replace(" ", "_").uppercase()
}
