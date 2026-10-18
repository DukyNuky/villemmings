package de.kraemersippe.villemmings

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

/**
 * Vollbild-Huelle um das Spiel. Die Spieldateien (web/) liegen als Assets in
 * der App und werden ueber eine https-Adresse ausgeliefert, damit ES-Module
 * und localStorage wie im Browser funktionieren. Es wird nichts nachgeladen.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this)
        web.setBackgroundColor(0xFF000000.toInt())
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            setSupportZoom(false)
            builtInZoomControls = false
            allowFileAccess = false
        }
        web.isHapticFeedbackEnabled = true
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assets.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) =
                request.url.host != HOST
        }
        web.addJavascriptInterface(Bridge(), "Android")
        setContentView(web)
        hideSystemBars()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Das Spiel entscheidet: Menue schliessen, eine Ebene zurueck – oder App beenden
                web.evaluateJavascript("window.villemmingsBack ? window.villemmingsBack() : false") { handled ->
                    if (handled != "true") finish()
                }
            }
        })

        if (savedInstanceState == null) {
            web.loadUrl("https://$HOST/index.html")
            Updater.check(this, silent = true)
        } else {
            web.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onPause() {
        super.onPause()
        web.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    private fun hideSystemBars() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    /** Fuer den Optionen-Bildschirm des Spiels. */
    inner class Bridge {
        @JavascriptInterface
        fun versionName(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun checkUpdate() {
            runOnUiThread { Updater.check(this@MainActivity, silent = false) }
        }
    }

    private companion object {
        const val HOST = "appassets.androidplatform.net"
    }
}
