package com.example.application

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.application.ui.theme.ApplicationTheme

private const val SOCIETY_MANAGEMENT_URL = "https://society-managment-o8iq.vercel.app"

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            ApplicationTheme {
                SocietyManagementWebView(
                    savedWebViewState = savedInstanceState,
                    onWebViewCreated = { webView = it }
                )
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView?.saveState(outState)
        super.onSaveInstanceState(outState)
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun SocietyManagementWebView(
    savedWebViewState: Bundle?,
    onWebViewCreated: (WebView) -> Unit
) {
    var webView by remember { mutableStateOf<WebView?>(null) }
    var canGoBack by remember { mutableStateOf(false) }
    var loadingProgress by remember { mutableIntStateOf(if (savedWebViewState == null) 0 else 100) }
    var firstPageLoaded by remember { mutableStateOf(savedWebViewState != null) }

    BackHandler(enabled = canGoBack) {
        webView?.goBack()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setLayerType(View.LAYER_TYPE_HARDWARE, null)
                    setBackgroundColor(android.graphics.Color.WHITE)

                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.databaseEnabled = true
                    settings.cacheMode = WebSettings.LOAD_DEFAULT
                    settings.loadsImagesAutomatically = true
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = true
                    settings.setSupportZoom(false)
                    settings.builtInZoomControls = false
                    settings.displayZoomControls = false

                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView,
                            request: WebResourceRequest
                        ): Boolean {
                            return false
                        }

                        override fun onPageFinished(view: WebView, url: String) {
                            super.onPageFinished(view, url)
                            canGoBack = view.canGoBack()
                            loadingProgress = 100
                            firstPageLoaded = true
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView, newProgress: Int) {
                            loadingProgress = newProgress
                            canGoBack = view.canGoBack()
                        }
                    }

                    webView = this
                    onWebViewCreated(this)

                    if (savedWebViewState != null) {
                        restoreState(savedWebViewState)
                    } else {
                        loadUrl(SOCIETY_MANAGEMENT_URL)
                    }
                }
            },
            update = { view ->
                webView = view
                onWebViewCreated(view)
                canGoBack = view.canGoBack()
            }
        )

        if (!firstPageLoaded) {
            AppLaunchLoader(progress = loadingProgress)
        }
    }
}

@Composable
private fun AppLaunchLoader(progress: Int) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFF6FAFF),
                        Color(0xFFEAF3FF),
                        Color.White
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(28.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(82.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color(0xFF1473E6), Color(0xFF764BA2))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "SM",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold
                )
            }

            Text(
                text = "Society Management",
                color = Color(0xFF102A43),
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 18.dp)
            )

            Text(
                text = "Opening your society dashboard...",
                color = Color(0xFF62748A),
                modifier = Modifier.padding(top = 7.dp, bottom = 18.dp)
            )

            LinearProgressIndicator(
                progress = { (progress.coerceIn(8, 100)) / 100f },
                modifier = Modifier
                    .size(width = 210.dp, height = 6.dp)
                    .clip(RoundedCornerShape(99.dp)),
                color = Color(0xFF1473E6),
                trackColor = Color(0xFFDCEBFF)
            )
        }
    }
}
