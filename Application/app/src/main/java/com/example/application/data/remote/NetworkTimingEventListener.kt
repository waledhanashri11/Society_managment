package com.example.application.data.remote

import android.util.Log
import com.example.application.BuildConfig
import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.Call
import okhttp3.EventListener
import okhttp3.Response

/** Debug-only request timing without headers, query values, tokens, or bodies. */
class NetworkTimingEventListener : EventListener() {
    private var startedAtNanos: Long = 0L
    private var responseCode: Int? = null
    private var serverTiming: String? = null

    override fun callStart(call: Call) {
        startedAtNanos = System.nanoTime()
    }

    override fun responseHeadersEnd(call: Call, response: Response) {
        responseCode = response.code
        serverTiming = response.header("Server-Timing")
    }

    override fun callEnd(call: Call) = log(call, null)

    override fun callFailed(call: Call, ioe: IOException) = log(call, ioe.javaClass.simpleName)

    private fun log(call: Call, failure: String?) {
        if (!BuildConfig.DEBUG || startedAtNanos == 0L) return
        val elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAtNanos)
        val request = call.request()
        val result = failure ?: responseCode?.toString() ?: "unknown"
        Log.d(
            "API_TIME",
            "${request.method} ${request.url.encodedPath} result=$result total=${elapsedMs}ms server=${serverTiming.orEmpty()}"
        )
    }
}
