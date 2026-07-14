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
import com.example.application.ui.screens.reports.AdminReportsScreen
import com.example.application.ui.screens.reports.ResidentReportsScreen
import com.example.application.ui.screens.resident.ResidentDashboardScreen
import com.example.application.ui.screens.resident.ResidentProfileScreen
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
                onLoginSuccess = { session ->
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
                onQuickAction = { title ->
                    when (title) {
                        "Residents" -> navController.navigate(AppRoute.AdminResidents.route)
                        "Flats" -> navController.navigate(AppRoute.AdminFlats.route)
                        "Staff" -> navController.navigate(AppRoute.AdminStaff.route)
                        "Generate Maintenance", "Maintenance" -> navController.navigate(AppRoute.AdminMaintenance.route)
                        "Complaints" -> navController.navigate(AppRoute.AdminComplaints.route)
                        "Add Notice", "View Notices", "Notices" -> navController.navigate(AppRoute.AdminNotices.route)
                        "Reports" -> navController.navigate(AppRoute.AdminReports.route)
                        "Notifications" -> navController.navigate(AppRoute.Notifications.route)
                        else -> navController.navigate(AppRoute.ComingSoon.createRoute(title))
                    }
                }
            )
        }

        composable(AppRoute.AdminReports.route) {
            AdminReportsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminMaintenance.route) {
            AdminMaintenanceScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminComplaints.route) {
            AdminComplaintsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminNotices.route) {
            NoticesScreen(onBack = { navController.popBackStack() }, admin = true)
        }

        composable(AppRoute.Notifications.route) {
            NotificationsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.AdminResidents.route) {
            ResidentsListScreen(
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(AppRoute.ResidentForm.createRoute()) },
                onOpen = { navController.navigate(AppRoute.ResidentDetails.createRoute(it)) },
                onEdit = { navController.navigate(AppRoute.ResidentForm.createRoute(it)) }
            )
        }

        composable(AppRoute.ResidentDetails.route) {
            ResidentDetailsScreen(
                onBack = { navController.popBackStack() },
                onEdit = { navController.navigate(AppRoute.ResidentForm.createRoute(it)) },
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
                onOpen = { navController.navigate(AppRoute.FlatDetails.createRoute(it)) },
                onEdit = { navController.navigate(AppRoute.FlatForm.createRoute(it)) }
            )
        }

        composable(AppRoute.FlatDetails.route) {
            FlatDetailsScreen(
                onBack = { navController.popBackStack() },
                onEdit = { navController.navigate(AppRoute.FlatForm.createRoute(it)) },
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
                onOpen = { navController.navigate(AppRoute.StaffDetails.createRoute(it)) },
                onEdit = { navController.navigate(AppRoute.StaffForm.createRoute(it)) }
            )
        }

        composable(AppRoute.StaffDetails.route) {
            StaffDetailsScreen(
                onBack = { navController.popBackStack() },
                onEdit = { navController.navigate(AppRoute.StaffForm.createRoute(it)) },
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
                onQuickAction = { title ->
                    when (title) {
                        "Maintenance", "Payment History" -> navController.navigate(AppRoute.ResidentMaintenance.route)
                        "Create Complaint", "Raise Complaint", "My Complaints" -> navController.navigate(AppRoute.ResidentComplaints.route)
                        "Notices", "View Notices" -> navController.navigate(AppRoute.ResidentNotices.route)
                        "Reports" -> navController.navigate(AppRoute.ResidentReports.route)
                        "Notifications" -> navController.navigate(AppRoute.Notifications.route)
                        else -> navController.navigate(AppRoute.ComingSoon.createRoute(title))
                    }
                }
            )
        }

        composable(AppRoute.ResidentReports.route) {
            ResidentReportsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentMaintenance.route) {
            ResidentMaintenanceScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentComplaints.route) {
            ResidentComplaintsScreen(onBack = { navController.popBackStack() })
        }

        composable(AppRoute.ResidentNotices.route) {
            NoticesScreen(onBack = { navController.popBackStack() }, admin = false)
        }

        composable(AppRoute.ResidentProfile.route) {
            ResidentProfileScreen(
                onBack = { navController.popBackStack() },
                onChangePassword = { navController.navigate(AppRoute.ChangePassword.route) }
            )
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
