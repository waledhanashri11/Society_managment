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
        val valDecimal = value ?: BigDecimal.ZERO
        val isWhole = try { valDecimal.remainder(BigDecimal.ONE).compareTo(BigDecimal.ZERO) == 0 } catch (_: Exception) { true }
        val fmt = (currency.clone() as NumberFormat).apply {
            maximumFractionDigits = if (isWhole) 0 else 2
            minimumFractionDigits = if (isWhole) 0 else 2
        }
        return fmt.format(valDecimal)
    }

    fun money(value: Double?): String {
        return money(value?.toBigDecimal())
    }

    fun money(value: String?): String {
        return money(value?.toBigDecimalOrNull())
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
