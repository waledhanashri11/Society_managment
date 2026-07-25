package com.example.application.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.application.R
import com.example.application.util.LocaleHelper

private data class AppLanguageOption(
    val code: String,
    val labelRes: Int
)

private val languageOptions = listOf(
    AppLanguageOption(LocaleHelper.ENGLISH, R.string.language_english),
    AppLanguageOption(LocaleHelper.HINDI, R.string.language_hindi),
    AppLanguageOption(LocaleHelper.MARATHI, R.string.language_marathi)
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LanguageSelector(
    modifier: Modifier = Modifier,
    showTitle: Boolean = true,
    showHint: Boolean = true
) {
    val context = LocalContext.current
    var selected by rememberSaveable { mutableStateOf(LocaleHelper.selectedLanguage(context)) }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (showTitle) {
            Text(
                text = stringResource(R.string.language),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        if (showHint) {
            Text(
                text = stringResource(R.string.language_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            languageOptions.forEach { option ->
                FilterChip(
                    selected = selected == option.code,
                    onClick = {
                        if (selected == option.code) return@FilterChip
                        selected = option.code
                        LocaleHelper.saveLanguage(context, option.code)
                        context.findActivity()?.recreate()
                    },
                    label = { Text(stringResource(option.labelRes)) }
                )
            }
        }
    }
}

@Composable
fun LanguageSelectorCard(modifier: Modifier = Modifier) {
    Card(modifier = modifier.fillMaxWidth()) {
        LanguageSelector(modifier = Modifier.padding(18.dp))
    }
}

private tailrec fun Context.findActivity(): Activity? {
    return when (this) {
        is Activity -> this
        is ContextWrapper -> baseContext.findActivity()
        else -> null
    }
}
