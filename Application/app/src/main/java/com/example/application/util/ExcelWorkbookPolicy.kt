package com.example.application.util

object ExcelWorkbookPolicy {
    const val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    const val XLS_MIME = "application/vnd.ms-excel"
    const val CSV_MIME = "text/csv"
    const val MAX_BYTES = 10L * 1024L * 1024L
    private val allowedMimeTypes = setOf(
        XLSX_MIME,
        XLS_MIME,
        CSV_MIME,
        "application/csv",
        "application/octet-stream"
    )

    fun validate(name: String, mimeType: String, size: Long): String? = when {
        !name.endsWith(".xlsx", true) && !name.endsWith(".xls", true) && !name.endsWith(".csv", true) -> "Select an .xlsx, .xls, or .csv file."
        mimeType.isNotBlank() && mimeType !in allowedMimeTypes -> "Unsupported Excel file type."
        size == 0L -> "The selected workbook is empty."
        size > MAX_BYTES -> "Workbook must be 10 MB or smaller."
        else -> null
    }
}
