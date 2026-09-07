package com.example.application.data.repository

import com.example.application.data.remote.api.ExcelTransactionsApiService
import com.example.application.data.remote.dto.ExcelImportConfirmDto
import com.example.application.data.remote.dto.ExcelImportConfirmRequest
import com.example.application.data.remote.dto.ExcelImportBatchDto
import com.example.application.data.remote.dto.ExcelImportPreviewDto
import com.example.application.data.remote.dto.ExcelTransactionFilters
import com.example.application.util.NetworkResult
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response

@Singleton
class ExcelTransactionsRepository @Inject constructor(
    private val api: ExcelTransactionsApiService
) {
    suspend fun export(filters: ExcelTransactionFilters) = binary {
        api.exportTransactions(
            filters.from.blankToNull(), filters.to.blankToNull(), filters.member.blankToNull(),
            filters.wing.blankToNull(), filters.flat.blankToNull(), filters.status.blankToNull(),
            filters.paymentMode.blankToNull()
        )
    }

    suspend fun template() = binary { api.downloadTemplate() }
    suspend fun errorReport(batchId: String) = binary { api.downloadErrors(batchId) }

    suspend fun preview(file: MultipartBody.Part): NetworkResult<ExcelImportPreviewDto> = runCatching {
        api.previewImport(file)
    }.fold(::unwrap, ::failure)

    suspend fun confirm(batchId: String): NetworkResult<ExcelImportConfirmDto> = runCatching {
        api.confirmImport(ExcelImportConfirmRequest(batchId))
    }.fold(::unwrap, ::failure)

    suspend fun history(): NetworkResult<List<ExcelImportBatchDto>> = runCatching {
        api.getImportHistory()
    }.fold(::unwrap, ::failure)

    private suspend fun binary(call: suspend () -> Response<ResponseBody>): NetworkResult<ResponseBody> =
        runCatching { call() }.fold({ response ->
            val body = response.body()
            if (response.isSuccessful && body != null) NetworkResult.Success(body)
            else NetworkResult.Error(com.example.application.util.AppError.Server(serverMessage(response) ?: readableError(response.code())))
        }, ::failure)

    private fun <T> unwrap(response: Response<com.example.application.data.remote.dto.ApiResponse<T>>): NetworkResult<T> {
        val body = response.body()
        val data = body?.data
        return if (response.isSuccessful && data != null) NetworkResult.Success(data)
        else NetworkResult.Error(com.example.application.util.AppError.Server(body?.message ?: readableError(response.code())))
    }

    private fun <T> failure(error: Throwable): NetworkResult<T> = NetworkResult.Error(
        if (error is IOException) com.example.application.util.AppError.NoInternet
        else com.example.application.util.AppError.Unknown(error.message)
    )

    private fun readableError(code: Int): String = when (code) {
        404 -> "Excel transaction service is not available on the backend yet."
        401 -> "Your session has expired. Please sign in again."
        403 -> "Only society administrators can use Excel transactions."
        413 -> "The selected workbook is too large."
        else -> "Excel transaction request failed (HTTP $code)."
    }

    /** API errors for downloads arrive as JSON even though successful calls are XLSX streams. */
    private fun serverMessage(response: Response<*>): String? = runCatching {
        val raw = response.errorBody()?.string().orEmpty()
        Regex("\\\"message\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"")
            .find(raw)?.groupValues?.getOrNull(1)
            ?.replace("\\\\\"", "\"")
            ?.replace("\\\\n", "\n")
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
    }.getOrNull()

    private fun String.blankToNull() = trim().takeIf { it.isNotEmpty() }
}
