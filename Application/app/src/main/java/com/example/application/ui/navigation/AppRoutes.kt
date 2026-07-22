package com.example.application.ui.navigation

sealed class AppRoute(val route: String) {
    data object Splash : AppRoute("splash")
    data object Login : AppRoute("login")
    data object Register : AppRoute("register")
    data object ForgotPassword : AppRoute("forgot_password")
    data object ResetPassword : AppRoute("reset_password?token={token}") {
        fun createRoute(token: String = "") = "reset_password?token=$token"
    }
    data object AdminDashboard : AppRoute("admin_dashboard")
    data object AdminResidents : AppRoute("admin_residents")
    data object ResidentDetails : AppRoute("admin_residents/{id}") {
        fun createRoute(id: String) = "admin_residents/$id"
    }
    data object ResidentForm : AppRoute("admin_residents/form/{id}") {
        fun createRoute(id: String = "new") = "admin_residents/form/$id"
    }
    data object AdminFlats : AppRoute("admin_flats")
    data object FlatDetails : AppRoute("admin_flats/{id}") {
        fun createRoute(id: String) = "admin_flats/$id"
    }
    data object FlatForm : AppRoute("admin_flats/form/{id}") {
        fun createRoute(id: String = "new") = "admin_flats/form/$id"
    }
    data object AdminStaff : AppRoute("admin_staff")
    data object StaffDetails : AppRoute("admin_staff/{id}") {
        fun createRoute(id: String) = "admin_staff/$id"
    }
    data object StaffForm : AppRoute("admin_staff/form/{id}") {
        fun createRoute(id: String = "new") = "admin_staff/form/$id"
    }
    data object AdminMaintenance : AppRoute("admin_maintenance")
    data object AdminPayments : AppRoute("admin_maintenance/payments")
    data object AdminReports : AppRoute("admin_reports")
    data object AdminNoc : AppRoute("admin_noc")
    data object AdminComplaints : AppRoute("admin_complaints")
    data object AdminNotices : AppRoute("admin_notices")
    data object AdminRules : AppRoute("admin_rules")
    data object AdminMeetings : AppRoute("admin_meetings")
    data object AdminAdvanced : AppRoute("admin_advanced")
    data object Notifications : AppRoute("notifications")
    data object ResidentDashboard : AppRoute("resident_dashboard")
    data object ResidentMaintenance : AppRoute("resident_maintenance")
    data object ResidentPaymentHistory : AppRoute("resident/payment-history")
    data object ResidentPayment : AppRoute("resident/payment/{id}") {
        fun createRoute(id: String) = "resident/payment/$id"
    }
    data object ResidentReports : AppRoute("resident_reports")
    data object ResidentNoc : AppRoute("resident_noc")
    data object ResidentMembers : AppRoute("resident/members")
    data object ResidentComplaints : AppRoute("resident_complaints")
    data object ResidentNotices : AppRoute("resident_notices")
    data object ResidentRules : AppRoute("resident_rules")
    data object ResidentMeetings : AppRoute("resident_meetings")
    data object ResidentProfile : AppRoute("resident_profile")
    data object ResidentAdvanced : AppRoute("resident_advanced")
    data object ChangePassword : AppRoute("change_password")
    data object ComingSoon : AppRoute("coming_soon/{title}") {
        fun createRoute(title: String) = "coming_soon/${title.replace(" ", "%20")}"
    }
}
