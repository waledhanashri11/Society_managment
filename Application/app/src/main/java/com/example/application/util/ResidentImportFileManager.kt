package com.example.application.util

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.IOException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okio.BufferedSink

object ResidentImportFileManager {
    const val XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    const val XLS = "application/vnd.ms-excel"
    const val CSV = "text/csv"
    private const val MAX_BYTES = 5L * 1024 * 1024

    data class SelectedFile(val uri: Uri, val name: String, val size: Long, val mimeType: String)

    fun inspect(context: Context, uri: Uri): Result<SelectedFile> = runCatching {
        var name = "residents.xlsx"; var size = -1L
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME).takeIf { it >= 0 }?.let { name = cursor.getString(it) ?: name }
                cursor.getColumnIndex(OpenableColumns.SIZE).takeIf { it >= 0 }?.let { size = cursor.getLong(it) }
            }
        }
        require(Regex("\\.(xlsx|xls|csv)$", RegexOption.IGNORE_CASE).containsMatchIn(name)) { "Select an .xlsx, .xls or .csv file." }
        require(size in 1..MAX_BYTES || size == -1L) { "File must be 5 MB or smaller." }
        val mime = context.contentResolver.getType(uri).orEmpty().ifBlank { when { name.endsWith(".csv",true)->CSV; name.endsWith(".xls",true)->XLS; else->XLSX } }
        SelectedFile(uri,name,size,mime)
    }

    fun multipart(context: Context, file: SelectedFile): MultipartBody.Part {
        val body=object:RequestBody(){
            override fun contentType()=file.mimeType.toMediaType()
            override fun contentLength()=file.size.takeIf{it>=0}?:-1L
            override fun writeTo(sink:BufferedSink){context.contentResolver.openInputStream(file.uri)?.use{input->val buffer=ByteArray(DEFAULT_BUFFER_SIZE);while(true){val count=input.read(buffer);if(count<0)break;sink.write(buffer,0,count)}}?:throw IOException("Unable to open file")}
        }
        return MultipartBody.Part.createFormData("file",file.name,body)
    }
}
