package com.example.application.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import java.io.File
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Native, offline report export using the already-filtered data displayed by the app. */
object ReportExportManager {
    enum class Format(val extension: String, val mimeType: String) {
        PDF("pdf", "application/pdf"), CSV("csv", "text/csv")
    }

    data class Result(val uri: Uri, val fileName: String)

    fun download(context: Context, title: String, subtitle: String, data: Any, format: Format): Result {
        val fileName = fileName(title, format)
        val uri = createDownloadUri(context, fileName, format.mimeType)
        context.contentResolver.openOutputStream(uri)?.use { output ->
            write(output, title, subtitle, data, format)
        } ?: error("Unable to create the export file")
        return Result(uri, fileName)
    }

    fun share(context: Context, title: String, subtitle: String, data: Any, format: Format) {
        val fileName = fileName(title, format)
        val directory = File(context.cacheDir, "report_exports").apply { mkdirs() }
        val file = File(directory, fileName)
        file.outputStream().use { write(it, title, subtitle, data, format) }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = format.mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, title)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share report"))
    }

    private fun write(output: OutputStream, title: String, subtitle: String, data: Any, format: Format) {
        val rows = flatten(Gson().toJsonTree(data))
        when (format) {
            Format.CSV -> writeCsv(output, title, subtitle, rows)
            Format.PDF -> writePdf(output, title, subtitle, rows)
        }
    }

    private fun flatten(root: JsonElement): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        fun visit(element: JsonElement?, section: String, record: String, field: String) {
            when {
                element == null || element.isJsonNull -> if (field.isNotBlank()) rows += listOf(section, record, humanize(field), "")
                element.isJsonObject -> element.asJsonObject.entrySet().forEach { (key, value) ->
                    val nextSection = if (section.isBlank()) humanize(key) else section
                    visit(value, nextSection, record, key)
                }
                element.isJsonArray -> {
                    val array: JsonArray = element.asJsonArray
                    if (array.size() == 0) rows += listOf(section.ifBlank { "Report" }, "", humanize(field), "No records")
                    array.forEachIndexed { index, value -> visit(value, section.ifBlank { humanize(field) }, (index + 1).toString(), field) }
                }
                else -> rows += listOf(section.ifBlank { "Summary" }, record, humanize(field), element.asString)
            }
        }
        if (root is JsonObject) root.entrySet().forEach { (key, value) -> visit(value, humanize(key), "", key) }
        else visit(root, "Report", "", "value")
        return rows
    }

    private fun writeCsv(output: OutputStream, title: String, subtitle: String, rows: List<List<String>>) {
        output.writer(Charsets.UTF_8).use { writer ->
            writer.write("\uFEFF")
            writer.appendLine(csv(title))
            writer.appendLine(csv(subtitle))
            writer.appendLine("Section,Record,Field,Value")
            rows.forEach { writer.appendLine(it.joinToString(",", transform = ::csv)) }
        }
    }

    private fun writePdf(output: OutputStream, title: String, subtitle: String, rows: List<List<String>>) {
        val document = PdfDocument()
        val width = 842
        val height = 595
        val margin = 36f
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.BLACK; textSize = 9f }
        var pageNumber = 0
        var page: PdfDocument.Page? = null
        var y = 0f

        fun startPage() {
            page?.let(document::finishPage)
            pageNumber++
            page = document.startPage(PdfDocument.PageInfo.Builder(width, height, pageNumber).create())
            y = margin
            paint.typeface = Typeface.DEFAULT_BOLD
            paint.textSize = 17f
            page!!.canvas.drawText(title.take(90), margin, y, paint)
            y += 20f
            paint.typeface = Typeface.DEFAULT
            paint.textSize = 9f
            page!!.canvas.drawText(subtitle.take(140), margin, y, paint)
            y += 16f
            page!!.canvas.drawLine(margin, y, width - margin, y, paint)
            y += 14f
        }

        startPage()
        var lastSection = ""
        rows.forEach { row ->
            val section = row[0]
            if (y > height - margin - 14f) startPage()
            if (section != lastSection) {
                if (y > height - margin - 30f) startPage()
                paint.typeface = Typeface.DEFAULT_BOLD
                paint.textSize = 11f
                page!!.canvas.drawText(section.take(100), margin, y, paint)
                y += 14f
                lastSection = section
            }
            paint.typeface = Typeface.DEFAULT
            paint.textSize = 8.5f
            val record = row[1].takeIf(String::isNotBlank)?.let { "#$it  " }.orEmpty()
            val line = "$record${row[2]}: ${row[3]}"
            wrap(line, 145).forEach { part ->
                if (y > height - margin) startPage()
                page!!.canvas.drawText(part, margin + 8f, y, paint)
                y += 11f
            }
        }
        page?.let(document::finishPage)
        document.writeTo(output)
        document.close()
    }

    private fun wrap(value: String, max: Int): List<String> {
        if (value.length <= max) return listOf(value)
        return value.chunked(max)
    }

    private fun csv(value: String): String = "\"${value.replace("\"", "\"\"").replace("\r", " ").replace("\n", " ")}\""

    private fun humanize(value: String): String = value
        .replace(Regex("([a-z])([A-Z])"), "$1 $2")
        .replace('_', ' ')
        .trim()
        .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

    private fun fileName(title: String, format: Format): String {
        val safe = title.lowercase(Locale.US).replace(Regex("[^a-z0-9]+"), "-").trim('-')
        val stamp = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())
        return "$safe-$stamp.${format.extension}"
    }

    private fun createDownloadUri(context: Context, fileName: String, mimeType: String): Uri {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mimeType)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SocietyHub")
            }
            return context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("Unable to create a Downloads entry")
        }
        val directory = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
        val file = File(directory, fileName)
        file.parentFile?.mkdirs()
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file).also {
            // FileProvider URIs cannot be opened through ContentResolver for a not-yet-created file.
            file.outputStream().close()
        }
    }
}
