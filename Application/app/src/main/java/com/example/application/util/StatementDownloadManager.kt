package com.example.application.util

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File
import okhttp3.ResponseBody

object StatementDownloadManager {
    fun save(context: Context, body: ResponseBody, name: String, pdf: Boolean): String {
        val mime = if (pdf) "application/pdf" else ExcelFileManager.XLSX_MIME
        val safe = name.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, safe)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SocietyHub")
            }) ?: error("Unable to create download")
        } else {
            val dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
            val file = File(dir, safe).apply { parentFile?.mkdirs(); outputStream().close() }
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        }
        context.contentResolver.openOutputStream(uri)?.use { out -> body.byteStream().use { it.copyTo(out) } }
            ?: error("Unable to save statement")
        return safe
    }
}
