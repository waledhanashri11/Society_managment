package com.example.application

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import dagger.hilt.android.AndroidEntryPoint
import com.example.application.ui.navigation.SocietyNavGraph
import com.example.application.ui.theme.ApplicationTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        createNotificationChannels()
        requestNotificationPermissionIfNeeded()

        setContent {
            ApplicationTheme {
                SocietyNavGraph()
            }
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channels = listOf(
            NotificationChannel("general", "General", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("maintenance", "Maintenance", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("payments", "Payments", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("complaints", "Complaints", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("notices", "Notices", NotificationManager.IMPORTANCE_DEFAULT)
        )
        manager.createNotificationChannels(channels)
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
