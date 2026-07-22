package com.example.application.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.navigation.NavType
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navDeepLink
import androidx.navigation.compose.rememberNavController
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.repository.AuthRepository
import com.example.application.ui.screens.admin.AdminDashboardScreen
import com.example.application.ui.screens.advanced.AdminAdvancedFeaturesScreen
import com.example.application.ui.screens.advanced.ResidentAdvancedFeaturesScreen
import com.example.application.ui.screens.admin.FlatDetailsScreen
import com.example.application.ui.screens.admin.FlatFormScreen
import com.example.application.ui.screens.admin.FlatsListScreen
import com.example.application.ui.screens.admin.ResidentDetailsScreen
import com.example.application.ui.screens.admin.ResidentFormScreen
import com.example.application.ui.screens.admin.ResidentsListScreen
import com.example.application.ui.screens.admin.StaffDetailsScreen
import com.example.application.ui.screens.admin.StaffFormScreen
import com.example.application.ui.screens.admin.StaffListScreen
import com.example.application.ui.screens.auth.ChangePasswordScreen
import com.example.application.ui.screens.auth.ForgotPasswordScreen
import com.example.application.ui.screens.auth.LoginScreen
import com.example.application.ui.screens.auth.RegisterScreen
import com.example.application.ui.screens.auth.ResetPasswordScreen
import com.example.application.ui.screens.common.ComingSoonScreen
import com.example.application.ui.screens.communication.AdminComplaintsScreen
import com.example.application.ui.screens.communication.NoticesScreen
import com.example.application.ui.screens.communication.NotificationsScreen
import com.example.application.ui.screens.communication.ResidentComplaintsScreen
import com.example.application.ui.screens.maintenance.AdminMaintenanceScreen
import com.example.application.ui.screens.maintenance.ResidentMaintenanceScreen
import com.example.application.ui.screens.noc.AdminNocScreen
import com.example.application.ui.screens.noc.ResidentNocScreen
import com.example.application.ui.screens.reports.AdminReportsScreen
import com.example.application.ui.screens.reports.ResidentReportsScreen
import com.example.application.ui.screens.resident.ResidentDashboardScreen
import com.example.application.ui.screens.resident.ResidentMembersScreen
import com.example.application.ui.screens.resident.ResidentPaymentHistoryScreen
import com.example.application.ui.screens.resident.ResidentPaymentScreen
import com.example.application.ui.screens.resident.ResidentProfileScreen
import com.example.application.ui.screens.rules.AdminSocietyRulesScreen
import com.example.application.ui.screens.rules.ResidentSocietyRulesScreen
import com.example.application.ui.screens.splash.SplashScreen
import com.example.application.viewmodel.SplashViewModel
import com.example.application.viewmodel.StartupState

@Composable
fun SocietyNavGraph(
    navController: NavHostController = rememberNavController()
) {
    fun dashboardRouteFor(session: UserSession): String {
        return when (session.role.lowercase()) {
            AuthRepository.ROLE_ADMIN -> AppRoute.AdminDashboard.route
            AuthRepository.ROLE_RESIDENT -> AppRoute.ResidentDashboard.route
            else -> AppRoute.Login.route
        }
    }

    fun navigateToLogin() {
        navController.navigate(AppRoute.Login.route) {
            popUpTo(0) {
                inclusive = true
            }
            launchSingleTop = true
        }
    }

    fun navigateToDashboard(session: UserSession) {
        navController.navigate(dashboardRouteFor(session)) {
            popUpTo(0) {
                inclusive = true
            }
            launchSingleTop = true
        }
    }

    fun navigateResidentTab(route: String) {
        navController.navigate(route) {
            launchSingleTop = true
            restoreState = true
            popUpTo(AppRoute.ResidentDashboard.route) { saveState = true }
        }
    }

    NavHost(
        navController = navController,
        startDestination = AppRoute.Splash.route
    ) {
        composable(AppRoute.Splash.route) {
            val viewModel: SplashViewModel = hiltViewModel()
            val startupState by viewModel.startupState.collectAsStateWithLifecycle()

            LaunchedEffect(startupState) {
                when (val state = startupState) {
                    StartupState.Checking -> Unit
                    StartupState.GoToLogin -> navigateToLogin()
                    is StartupState.GoToDashboard -> navigateToDashboard(state.session)
                }
            }

            SplashScreen()
        }

        composable(AppRoute.Login.route) {
            LoginScreen(
                onLoginSuccess = { session: UserSession ->
                    navigateToDashboard(session)
                },
                onRegisterClick = { navController.navigate(AppRoute.Register.route) },
                onForgotPasswordClick = { navController.navigate(AppRoute.ForgotPassword.route) }
            )
        }

        composable(AppRoute.Register.route) {
            RegisterScreen(onBackToLogin = ::navigateToLogin)
        }

        composable(AppRoute.ForgotPassword.route) {
            ForgotPasswordScreen(onBackToLogin = ::navigateToLogin)
        }

        composable(
            route = AppRoute.ResetPassword.route,
            arguments = listOf(navArgument("token") {
                type = NavType.StringType
                defaultValue = ""
                nullable = true
            }),
            deepLinks = listOf(
                navDeepLink {
                    uriPattern = "societymanagement://reset-password?token={token}"
                }
            )
        ) { backStackEntry ->
            ResetPasswordScreen(
                token = backStackEntry.arguments?.getString("token").orEmpty(),
                onResetComplete = ::navigateToLogin
            )
        }

        composable(AppRoute.AdminDashboard.route) {
            AdminDashboardScreen(
                onLogoutComplete = ::navigateToLogin,
                onQuickAction = { title: String ->
                    when (title) {
                        "Residents" -> navController.navigate(AppRoute.AdminResidents.route)
                        "Flats" -> navController.navigate(AppRoute.AdminFlats.route)
                        "Add Resident" -> navController.navigate(AppRoute.ResidentForm.createRoute())
                        "Staff" -> navController.navigate(AppRoute.AdminStaff.route)
                        "Security" -> navController.navigate(AppRoute.AdminStaff.route)
                        "Generate Maintenance", "Maintenance", "Maintenance Collection", "Maintenance & Payments" -> navController.navigate(AppRoute.AdminMaintenance.route)
                        "Dues & Payments", "Payments", "Payment Reviews" -> navController.navigate(AppRoute.AdminPayments.route)
                        "Complaints" -> navController.navigate(AppRoute.AdminComplaints.route)
                        "Add Notice", "View Notices", "Notices" -> navController.navigate(AppRoute.AdminNotices.route)
                        "Rules", "Society Rules" -> navController.navigate(AppRoute.AdminRules.route)
                        "Reports" -> navController.navigate(AppRoute.AdminReports.route)
                        "NOC Requests" -> navController.navigate(AppRoute.AdminNoc.route)
                        "Notifications" -> navController.navigate(AppRoute.Notifications.route)
                        "Events" -> navController.navigate(AppRoute.ComingSoon.createRoute("Events - backend module not available yet"))
                        "Visitors", "Settings", "Advanced Tools", "More" -> navController.navigate(AppRoute.AdminAdvanced.route)
                        else -> navController.navigate(AppRoute.ComingSoon.createRoute(title))
                    }
                }
            )
        }

        composable(AppRoute.AdminReports.route) {
            AdminReportsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminNoc.route) {
            AdminNocScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminMaintenance.route) {
            AdminMaintenanceScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminPayments.route) {
            AdminMaintenanceScreen(
                onBack = { navController.popBackStack() },
                initialTab = "Payments"
            )
        }

        composable(AppRoute.AdminComplaints.route) {
            AdminComplaintsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminNotices.route) {
            NoticesScreen(onBack = { navController.popBackStack() }, admin = true)
        }

        composable(AppRoute.AdminRules.route) {
            AdminSocietyRulesScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.Notifications.route) {
            NotificationsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminAdvanced.route) {
            AdminAdvancedFeaturesScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminResidents.route) {
            ResidentsListScreen(
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(AppRoute.ResidentForm.createRoute()) },
                onOpen = { residentId: String -> navController.navigate(AppRoute.ResidentDetails.createRoute(residentId)) },
                onEdit = { residentId: String -> navController.navigate(AppRoute.ResidentForm.createRoute(residentId)) }
            )
        }

        composable(AppRoute.ResidentDetails.route) {
            ResidentDetailsScreen(
                onBack = { navController.popBackStack() },
                onEdit = { residentId: String -> navController.navigate(AppRoute.ResidentForm.createRoute(residentId)) },
                onDeleted = { navController.popBackStack(AppRoute.AdminResidents.route, inclusive = false) }
            )
        }

        composable(AppRoute.ResidentForm.route) {
            val id = it.arguments?.getString("id")
            ResidentFormScreen(
                title = if (id == "new") "Add Resident" else "Edit Resident",
                onBack = { navController.popBackStack() }
            )
        }

        composable(AppRoute.AdminFlats.route) {
            FlatsListScreen(
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(AppRoute.FlatForm.createRoute()) },
                onOpen = { flatId: String -> navController.navigate(AppRoute.FlatDetails.createRoute(flatId)) },
                onEdit = { flatId: String -> navController.navigate(AppRoute.FlatForm.createRoute(flatId)) }
            )
        }

        composable(AppRoute.FlatDetails.route) {
            FlatDetailsScreen(
                onBack = { navController.popBackStack() },
                onEdit = { flatId: String -> navController.navigate(AppRoute.FlatForm.createRoute(flatId)) },
                onDeleted = { navController.popBackStack(AppRoute.AdminFlats.route, inclusive = false) }
            )
        }

        composable(AppRoute.FlatForm.route) {
            val id = it.arguments?.getString("id")
            FlatFormScreen(
                title = if (id == "new") "Add Flat" else "Edit Flat",
                onBack = { navController.popBackStack() }
            )
        }

        composable(AppRoute.AdminStaff.route) {
            StaffListScreen(
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(AppRoute.StaffForm.createRoute()) },
                onOpen = { staffId: String -> navController.navigate(AppRoute.StaffDetails.createRoute(staffId)) },
                onEdit = { staffId: String -> navController.navigate(AppRoute.StaffForm.createRoute(staffId)) }
            )
        }

        composable(AppRoute.StaffDetails.route) {
            StaffDetailsScreen(
                onBack = { navController.popBackStack() },
                onEdit = { staffId: String -> navController.navigate(AppRoute.StaffForm.createRoute(staffId)) },
                onDeleted = { navController.popBackStack(AppRoute.AdminStaff.route, inclusive = false) }
            )
        }

        composable(AppRoute.StaffForm.route) {
            val id = it.arguments?.getString("id")
            StaffFormScreen(
                title = if (id == "new") "Add Staff" else "Edit Staff",
                onBack = { navController.popBackStack() }
            )
        }

        composable(AppRoute.ResidentDashboard.route) {
            ResidentDashboardScreen(
                onProfileClick = { navController.navigate(AppRoute.ResidentProfile.route) },
                onLogoutComplete = ::navigateToLogin,
                onQuickAction = { title: String ->
                    when {
                        title.startsWith("ResidentPayment:") -> {
                            val id = title.substringAfter(":")
                            if (id.isNotBlank()) navController.navigate(AppRoute.ResidentPayment.createRoute(id))
                        }
                        title == "Maintenance" -> navController.navigate(AppRoute.ResidentMaintenance.route)
                        title == "Payment History" -> navController.navigate(AppRoute.ResidentPaymentHistory.route)
                        title == "Create Complaint" || title == "Raise Complaint" || title == "My Complaints" -> navController.navigate(AppRoute.ResidentComplaints.route)
                        title == "Notices" || title == "View Notices" -> navController.navigate(AppRoute.ResidentNotices.route)
                        title == "Rules" || title == "Society Rules" -> navController.navigate(AppRoute.ResidentRules.route)
                        title == "Reports" -> navController.navigate(AppRoute.ResidentReports.route)
                        title == "NOC Requests" -> navController.navigate(AppRoute.ResidentNoc.route)
                        title == "Members" -> navController.navigate(AppRoute.ResidentMembers.route)
                        title == "Notifications" -> navController.navigate(AppRoute.Notifications.route)
                        title == "Visitors" || title == "Parcels" || title == "Activities" || title == "More" || title == "Services" -> navController.navigate(AppRoute.ResidentAdvanced.route)
                        else -> navController.navigate(AppRoute.ComingSoon.createRoute(title))
                    }
                }
            )
        }

        composable(AppRoute.ResidentReports.route) {
            ResidentReportsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentNoc.route) {
            ResidentNocScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentPaymentHistory.route) {
            ResidentPaymentHistoryScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = AppRoute.ResidentPayment.route,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            val billId = backStackEntry.arguments?.getString("id") ?: ""
            ResidentPaymentScreen(
                billId = billId,
                onBack = { navController.popBackStack() },
                onViewPaymentHistory = { navController.navigate(AppRoute.ResidentPaymentHistory.route) }
            )
        }

        composable(AppRoute.ResidentMembers.route) {
            ResidentMembersScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentMaintenance.route) {
            ResidentMaintenanceScreen(
                onBack = { navController.popBackStack() },
                onPayBill = { billId -> navController.navigate(AppRoute.ResidentPayment.createRoute(billId)) },
                onPaymentHistory = { navController.navigate(AppRoute.ResidentPaymentHistory.route) },
                onHome = { navigateResidentTab(AppRoute.ResidentDashboard.route) },
                onNotices = { navigateResidentTab(AppRoute.ResidentNotices.route) },
                onProfile = { navigateResidentTab(AppRoute.ResidentProfile.route) }
            )
        }

        composable(AppRoute.ResidentComplaints.route) {
            ResidentComplaintsScreen(
                onBack = { navController.popBackStack() },
                onHome = { navigateResidentTab(AppRoute.ResidentDashboard.route) },
                onNotices = { navigateResidentTab(AppRoute.ResidentNotices.route) },
                onPayments = { navigateResidentTab(AppRoute.ResidentMaintenance.route) },
                onReports = { navigateResidentTab(AppRoute.ResidentReports.route) },
                onProfile = { navigateResidentTab(AppRoute.ResidentProfile.route) }
            )
        }

        composable(AppRoute.ResidentNotices.route) {
            NoticesScreen(onBack = { navController.popBackStack() }, admin = false)
        }

        composable(AppRoute.ResidentRules.route) {
            ResidentSocietyRulesScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentProfile.route) {
            ResidentProfileScreen(
                onBack = { navController.popBackStack() },
                onChangePassword = { navController.navigate(AppRoute.ChangePassword.route) },
                onLogoutComplete = ::navigateToLogin
            )
        }

        composable(AppRoute.ResidentAdvanced.route) {
            ResidentAdvancedFeaturesScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ChangePassword.route) {
            ChangePasswordScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ComingSoon.route) { backStackEntry ->
            ComingSoonScreen(
                title = backStackEntry.arguments?.getString("title")?.replace("%20", " ") ?: "Coming Soon",
                onBack = { navController.popBackStack() }
            )
        }
    }
}


