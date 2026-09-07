package com.example.application.ui.components

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.material3.LocalTextStyle
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.example.application.R
import java.util.Locale

private var englishStringCache: Map<String, Int>? = null

private fun defaultEnglishStrings(context: android.content.Context): Map<String, Int> {
    englishStringCache?.let { return it }
    val configuration = android.content.res.Configuration(context.resources.configuration).apply {
        setLocale(Locale.ENGLISH)
    }
    val englishResources = context.createConfigurationContext(configuration).resources
    return R.string::class.java.fields.mapNotNull { field ->
        runCatching {
            val id = field.getInt(null)
            englishResources.getString(id) to id
        }.getOrNull()
    }.toMap().also { englishStringCache = it }
}

/** Resolves a legacy English literal through its matching string resource. */
@Composable
fun localizedText(value: String): String {
    val configuration = LocalConfiguration.current
    val context = LocalContext.current
    return remember(value, configuration.locales) {
        defaultEnglishStrings(context)[value]?.let(context::getString) ?: value
    }
}

/** Drop-in Material Text replacement used while legacy screens move to string resources. */
@Composable
fun LocalizedText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    fontSize: TextUnit = TextUnit.Unspecified,
    fontStyle: FontStyle? = null,
    fontWeight: FontWeight? = null,
    fontFamily: FontFamily? = null,
    letterSpacing: TextUnit = TextUnit.Unspecified,
    textDecoration: TextDecoration? = null,
    textAlign: TextAlign? = null,
    lineHeight: TextUnit = TextUnit.Unspecified,
    overflow: TextOverflow = TextOverflow.Clip,
    softWrap: Boolean = true,
    maxLines: Int = Int.MAX_VALUE,
    minLines: Int = 1,
    onTextLayout: ((TextLayoutResult) -> Unit)? = null,
    style: TextStyle = LocalTextStyle.current
) {
    androidx.compose.material3.Text(
        text = localizedText(text), modifier = modifier, color = color, fontSize = fontSize,
        fontStyle = fontStyle, fontWeight = fontWeight, fontFamily = fontFamily,
        letterSpacing = letterSpacing, textDecoration = textDecoration, textAlign = textAlign,
        lineHeight = lineHeight, overflow = overflow, softWrap = softWrap, maxLines = maxLines,
        minLines = minLines, onTextLayout = onTextLayout, style = style
    )
}

@Composable
fun LocalizedText(
    text: AnnotatedString,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    fontSize: TextUnit = TextUnit.Unspecified,
    fontStyle: FontStyle? = null,
    fontWeight: FontWeight? = null,
    fontFamily: FontFamily? = null,
    letterSpacing: TextUnit = TextUnit.Unspecified,
    textDecoration: TextDecoration? = null,
    textAlign: TextAlign? = null,
    lineHeight: TextUnit = TextUnit.Unspecified,
    overflow: TextOverflow = TextOverflow.Clip,
    softWrap: Boolean = true,
    maxLines: Int = Int.MAX_VALUE,
    minLines: Int = 1,
    inlineContent: Map<String, androidx.compose.foundation.text.InlineTextContent> = mapOf(),
    onTextLayout: (TextLayoutResult) -> Unit = {},
    style: TextStyle = LocalTextStyle.current
) {
    androidx.compose.material3.Text(
        text = text, modifier = modifier, color = color, fontSize = fontSize, fontStyle = fontStyle,
        fontWeight = fontWeight, fontFamily = fontFamily, letterSpacing = letterSpacing,
        textDecoration = textDecoration, textAlign = textAlign, lineHeight = lineHeight,
        overflow = overflow, softWrap = softWrap, maxLines = maxLines, minLines = minLines,
        inlineContent = inlineContent, onTextLayout = onTextLayout, style = style
    )
}

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
        "overview" -> R.string.overview
        "residents" -> R.string.residents
        "flats", "total flats" -> R.string.flats
        "maintenance" -> R.string.maintenance
        "payments", "total collections" -> R.string.payments
        "payment history" -> R.string.payment_history
        "payment verification" -> R.string.payment_verification
        "payment reviews" -> R.string.payment_reviews
        "dues & payments", "pending dues" -> R.string.dues_payments
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
        "events" -> R.string.events_title
        "notifications" -> R.string.notifications
        "write-offs", "write-off history" -> R.string.report_write_offs
        "flat transfers" -> R.string.flats
        else -> null
    }
}

private fun String?.normalizeStatus(): String {
    return orEmpty().trim().replace("-", "_").replace(" ", "_").uppercase()
}
