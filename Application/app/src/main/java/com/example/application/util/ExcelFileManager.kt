package com.example.application.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okio.BufferedSink

object ExcelFileManager {
    const val XLSX_MIME = ExcelWorkbookPolicy.XLSX_MIME
    const val XLS_MIME = ExcelWorkbookPolicy.XLS_MIME

    data class SelectedFile(val uri: Uri, val name: String, val size: Long, val mimeType: String)
    data class SavedFile(val uri: Uri, val name: String)

    fun inspect(context: Context, uri: Uri): Result<SelectedFile> = runCatching {
        val resolver = context.contentResolver
        var name = "transactions.xlsx"
        var size = -1L
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                name = cursor.string(OpenableColumns.DISPLAY_NAME) ?: name
                size = cursor.long(OpenableColumns.SIZE)
            }
        }
        val mime = resolver.getType(uri).orEmpty()
        ExcelWorkbookPolicy.validate(name, mime, size)?.let { error(it) }
        resolver.openInputStream(uri)?.use { input -> require(input.read() >= 0) { "The selected workbook is empty." } }
            ?: error("The selected workbook cannot be opened.")
        SelectedFile(uri, name, size, mime.ifBlank { XLSX_MIME })
    }

    fun multipart(context: Context, selected: SelectedFile): MultipartBody.Part {
        val body = object : RequestBody() {
            override fun contentType() = selected.mimeType.toMediaType()
            override fun contentLength() = selected.size.takeIf { it >= 0 } ?: -1L
            override fun writeTo(sink: BufferedSink) {
                context.contentResolver.openInputStream(selected.uri)?.use { input ->
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        sink.write(buffer, 0, count)
                    }
                } ?: throw IOException("Unable to open the selected workbook")
            }
        }
        return MultipartBody.Part.createFormData("file", selected.name, body)
    }

    fun save(context: Context, bytes: okhttp3.ResponseBody, suggestedName: String): SavedFile {
        val safeName = sanitizeName(suggestedName)
        val uri = createDownloadUri(context, safeName)
        context.contentResolver.openOutputStream(uri)?.use { output -> bytes.byteStream().use { it.copyTo(output) } }
            ?: error("Unable to save the downloaded workbook")
        return SavedFile(uri, safeName)
    }

    fun open(context: Context, file: SavedFile) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(file.uri, XLSX_MIME)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Open Excel workbook"))
    }

    fun share(context: Context, file: SavedFile) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = XLSX_MIME
            putExtra(Intent.EXTRA_STREAM, file.uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share Excel workbook"))
    }

    private fun createDownloadUri(context: Context, name: String): Uri {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, name)
                put(MediaStore.Downloads.MIME_TYPE, XLSX_MIME)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SocietyHub")
            }
            return context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("Unable to create a Downloads entry")
        }
        val directory = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
        val file = File(directory, name).apply { parentFile?.mkdirs(); outputStream().close() }
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    }

    private fun sanitizeName(value: String): String {
        val base = value.substringAfterLast('/').replace(Regex("[^A-Za-z0-9._-]"), "_")
        return (base.takeIf { it.endsWith(".xlsx", true) } ?: "$base.xlsx").take(120)
    }

    private fun Cursor.string(column: String): String? = getColumnIndex(column).takeIf { it >= 0 }?.let(::getString)
    private fun Cursor.long(column: String): Long = getColumnIndex(column).takeIf { it >= 0 }?.let(::getLong) ?: -1L
}
