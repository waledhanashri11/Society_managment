package com.example.application.util

import java.math.BigDecimal
import java.text.NumberFormat
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object DashboardFormatters {
    private val currency = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    private val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("en", "IN"))

    fun money(value: BigDecimal?): String {
        return currency.format(value ?: BigDecimal.ZERO)
    }

    fun date(value: String?): String {
        if (value.isNullOrBlank()) return "—"
        return try {
            OffsetDateTime.parse(value).format(dateFormatter)
        } catch (_: Exception) {
            value.take(10)
        }
    }

    fun percent(value: Int): String = "$value%"

    fun statusLabel(value: String?): String {
        return value.orEmpty()
            .ifBlank { "Unknown" }
            .replace("_", " ")
            .split(" ")
            .joinToString(" ") { word -> word.replaceFirstChar { it.uppercase() } }
    }
}

fun String?.toMoneyDecimal(): BigDecimal {
    return try {
        this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
    } catch (_: Exception) {
        BigDecimal.ZERO
    }
}
