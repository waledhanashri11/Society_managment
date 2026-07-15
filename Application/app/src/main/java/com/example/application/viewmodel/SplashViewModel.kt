package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _startupState = MutableStateFlow<StartupState>(StartupState.Checking)
    val startupState: StateFlow<StartupState> = _startupState.asStateFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            val session = authRepository.getSavedSessionForStartup()
            _startupState.value = if (session == null) {
                StartupState.GoToLogin
            } else {
                StartupState.GoToDashboard(session)
            }
        }
    }
}

sealed interface StartupState {
    data object Checking : StartupState
    data object GoToLogin : StartupState
    data class GoToDashboard(val session: UserSession) : StartupState
}
