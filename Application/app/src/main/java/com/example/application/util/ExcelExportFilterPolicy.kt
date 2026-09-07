package com.example.application.util

import com.example.application.data.remote.dto.ExcelTransactionFilters
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

object ExcelExportFilterPolicy {
    fun validate(filters: ExcelTransactionFilters): String? {
        val from = parseDate(filters.from)
        if (filters.from.isNotBlank() && from == null) return "From date must use YYYY-MM-DD."
        val to = parseDate(filters.to)
        if (filters.to.isNotBlank() && to == null) return "To date must use YYYY-MM-DD."
        return if (from != null && to != null && from.isAfter(to)) "From date cannot be after To date." else null
    }

    private fun parseDate(value: String): LocalDate? {
        if (value.isBlank()) return null
        return try { LocalDate.parse(value.trim(), DateTimeFormatter.ISO_LOCAL_DATE) }
        catch (_: DateTimeParseException) { null }
    }
}
