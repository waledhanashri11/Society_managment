package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ExcelTransactionFilters(
    val from: String = "",
    val to: String = "",
    val member: String = "",
    val wing: String = "",
    val flat: String = "",
    val status: String = "",
    val paymentMode: String = ""
)

data class ExcelImportPreviewRowDto(
    @SerializedName(value = "rowNumber", alternate = ["row_number", "row"]) val rowNumber: Int = 0,
    @SerializedName(value = "memberName", alternate = ["member_name"]) val memberName: String? = null,
    val wing: String? = null,
    @SerializedName(value = "flatNumber", alternate = ["flat_number", "flat_no"]) val flatNumber: String? = null,
    @SerializedName(value = "transactionDate", alternate = ["transaction_date"]) val transactionDate: String? = null,
    @SerializedName(value = "paymentMode", alternate = ["payment_mode"]) val paymentMode: String? = null,
    val amount: String? = null,
    val status: String? = null,
    @SerializedName(value = "importAction", alternate = ["import_action", "action"]) val importAction: String? = null,
    @SerializedName(value = "validationResult", alternate = ["validation_result", "result"]) val validationResult: String? = null,
    @SerializedName(value = "validationMessage", alternate = ["validation_message", "message"]) val validationMessage: String? = null
)

data class ExcelImportPreviewDto(
    @SerializedName(value = "batchId", alternate = ["batch_id"]) val batchId: String = "",
    @SerializedName(value = "totalRows", alternate = ["total_rows"]) val totalRows: Int = 0,
    @SerializedName(value = "validRows", alternate = ["valid_rows", "validCount"]) val validRows: Int = 0,
    @SerializedName(value = "invalidRows", alternate = ["invalid_rows", "invalidCount"]) val invalidRows: Int = 0,
    @SerializedName(value = "warningRows", alternate = ["warning_rows", "warningCount"]) val warningRows: Int = 0,
    @SerializedName(value = "totalValidAmount", alternate = ["total_valid_amount"]) val totalValidAmount: String? = null,
    val rows: List<ExcelImportPreviewRowDto> = emptyList()
)

data class ExcelImportConfirmRequest(@SerializedName("batchId") val batchId: String)

data class ExcelImportConfirmDto(
    @SerializedName(value = "batchId", alternate = ["batch_id"]) val batchId: String = "",
    val imported: Int = 0,
    val skipped: Int = 0,
    val failed: Int = 0,
    val message: String? = null
)

data class ExcelImportBatchDto(
    val id: String = "",
    @SerializedName(value = "fileName", alternate = ["file_name"]) val fileName: String? = null,
    val status: String? = null,
    @SerializedName(value = "createdAt", alternate = ["created_at"]) val createdAt: String? = null,
    @SerializedName(value = "totalRows", alternate = ["total_rows"]) val totalRows: Int = 0,
    val imported: Int = 0,
    val failed: Int = 0
)
