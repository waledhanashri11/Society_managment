package com.example.application.util

sealed interface AppError {
    data object NoInternet : AppError
    data object Timeout : AppError
    data object Unauthorized : AppError
    data class Forbidden(val message: String? = null) : AppError
    data class Validation(val message: String) : AppError
    data class Server(val message: String? = null) : AppError
    data class Unknown(val message: String? = null) : AppError
}
