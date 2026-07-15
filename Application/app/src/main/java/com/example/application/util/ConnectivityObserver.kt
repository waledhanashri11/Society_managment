package com.example.application.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

@Singleton
class ConnectivityObserver @Inject constructor(
    @ApplicationContext context: Context
) {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    fun observe(): Flow<NetworkStatus> {
        return callbackFlow {
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    trySend(NetworkStatus.Available)
                }

                override fun onUnavailable() {
                    trySend(NetworkStatus.Unavailable)
                }

                override fun onLosing(network: Network, maxMsToLive: Int) {
                    trySend(NetworkStatus.Losing)
                }

                override fun onLost(network: Network) {
                    trySend(NetworkStatus.Lost)
                }
            }

            connectivityManager.registerDefaultNetworkCallback(callback)

            awaitClose {
                connectivityManager.unregisterNetworkCallback(callback)
            }
        }.distinctUntilChanged()
    }
}

enum class NetworkStatus {
    Available,
    Unavailable,
    Losing,
    Lost
}
