package com.example.application.data.repository

import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.remote.api.DashboardApiService
import com.example.application.data.remote.api.ResidentApiService
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.PaymentDto
import com.example.application.data.remote.dto.ProfileDto
import com.example.application.data.remote.dto.UserSummaryDto
import java.math.BigDecimal
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

@Singleton
class DashboardRepository @Inject constructor(
    private val dashboardApiService: DashboardApiService,
    private val residentApiService: ResidentApiService,
    private val sessionPreferences: SessionPreferences
) {
    private var lastAdminDashboard: AdminDashboardData? = null
    private var lastResidentDashboard: ResidentDashboardData? = null

    suspend fun getAdminDashboardSnapshot(): AdminDashboardData {
        lastAdminDashboard?.let { return it }
        val session = sessionPreferences.getCachedSession() ?: sessionPreferences.readSession()
        return AdminDashboardData(
            adminName = session?.name?.ifBlank { "Admin" } ?: "Admin",
            totalResidents = 0,
            totalFlats = 0,
            occupiedFlats = 0,
            vacantFlats = 0,
            pendingRegistrations = 0,
            totalBilled = BigDecimal.ZERO,
            collected = BigDecimal.ZERO,
            pending = BigDecimal.ZERO,
            paidBillCount = 0,
            pendingBillCount = 0,
            overdueBillCount = 0,
            openComplaints = 0,
            inProgressComplaints = 0,
            resolvedComplaints = 0,
            totalNotices = 0,
            latestNotices = emptyList(),
            recentComplaints = emptyList(),
            recentPayments = emptyList(),
            warnings = listOf("Refreshing latest society data")
        )
    }

    suspend fun getResidentDashboardSnapshot(): ResidentDashboardData {
        lastResidentDashboard?.let { return it }
        val session = sessionPreferences.getCachedSession() ?: sessionPreferences.readSession()
        val profile = ProfileDto(
            id = session?.userId,
            name = session?.name,
            email = session?.email,
            phone = session?.phone,
            role = session?.role,
            status = session?.status,
            flatId = null,
            flatNo = null,
            wing = null,
            floorNo = null,
            flatStatus = null,
            societyName = null
        )
        return ResidentDashboardData(
            profile = profile,
            currentBill = null,
            totalDue = BigDecimal.ZERO,
            totalPaid = BigDecimal.ZERO,
            pendingBillCount = 0,
            paidBillCount = 0,
            totalComplaints = 0,
            openComplaints = 0,
            inProgressComplaints = 0,
            resolvedComplaints = 0,
            latestNotices = emptyList(),
            recentComplaints = emptyList(),
            warnings = listOf("Refreshing latest society data")
        )
    }

    suspend fun getAdminDashboard(refresh: Boolean = false): DashboardLoadResult<AdminDashboardData> = coroutineScope {
        if (!refresh && lastAdminDashboard != null) {
            return@coroutineScope DashboardLoadResult.Success(lastAdminDashboard!!, fromCache = true)
        }

        val usersDeferred = async { runCatching { dashboardApiService.getUsers() } }
        val flatsDeferred = async { runCatching { dashboardApiService.getFlats() } }
        val billsDeferred = async { runCatching { dashboardApiService.getMaintenanceBills() } }
        val complaintsDeferred = async { runCatching { dashboardApiService.getComplaints() } }
        val noticesDeferred = async { runCatching { dashboardApiService.getLatestNotices() } }
        val paymentsDeferred = async { runCatching { dashboardApiService.getPayments() } }

        val warnings = mutableListOf<String>()
        val users = usersDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body() ?: emptyList<UserSummaryDto>().also { warnings.add("Residents unavailable") }
        val flats = flatsDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body() ?: emptyList<FlatDto>().also { warnings.add("Flats unavailable") }
        val bills = billsDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body()?.data ?: emptyList<MaintenanceBillDto>().also { warnings.add("Maintenance unavailable") }
        val complaints = complaintsDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body() ?: emptyList<ComplaintDto>().also { warnings.add("Complaints unavailable") }
        val notices = noticesDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body() ?: emptyList<NoticeDto>().also { warnings.add("Notices unavailable") }
        val payments = paymentsDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body()?.data ?: emptyList<PaymentDto>()

        val adminName = sessionPreferences.readSession()?.name?.ifBlank { "Admin" } ?: "Admin"
        val residents = users.filter { it.role == "resident" }
        val occupiedFlats = flats.count { it.status.equals("Occupied", ignoreCase = true) || !it.id.isNullOrBlank() && residents.any { user -> user.flatId == it.id } }
        val paidBills = bills.filter { it.paymentStatus.equals("Paid", true) || it.status.equals("Paid", true) }
        val pendingBills = bills.filterNot { it.paymentStatus.equals("Paid", true) || it.status.equals("Paid", true) }
        val totalBilled = bills.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.totalAmount.toMoneyDecimal() }
        val collected = paidBills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.paidAmount ?: bill.totalAmount).toMoneyDecimal() }
        val pending = pendingBills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal() }

        val data = AdminDashboardData(
            adminName = adminName,
            totalResidents = residents.size,
            totalFlats = flats.size,
            occupiedFlats = occupiedFlats,
            vacantFlats = (flats.size - occupiedFlats).coerceAtLeast(0),
            pendingRegistrations = residents.count { it.status.equals("pending", true) },
            totalBilled = totalBilled,
            collected = collected,
            pending = pending,
            paidBillCount = paidBills.size,
            pendingBillCount = pendingBills.size,
            overdueBillCount = pendingBills.count { it.status.equals("Overdue", true) || it.paymentStatus.equals("Overdue", true) },
            openComplaints = complaints.count { it.status.equals("pending", true) },
            inProgressComplaints = complaints.count { it.status.equals("in_progress", true) },
            resolvedComplaints = complaints.count { it.status.equals("resolved", true) },
            totalNotices = notices.size,
            latestNotices = notices.take(5),
            recentComplaints = complaints.take(4),
            recentPayments = payments.take(4),
            warnings = warnings.distinct()
        )
        lastAdminDashboard = data
        DashboardLoadResult.Success(data, fromCache = false)
    }

    suspend fun getResidentDashboard(refresh: Boolean = false): DashboardLoadResult<ResidentDashboardData> = coroutineScope {
        if (!refresh && lastResidentDashboard != null) {
            return@coroutineScope DashboardLoadResult.Success(lastResidentDashboard!!, fromCache = true)
        }

        val dashboardDeferred = async { runCatching { residentApiService.getDashboard() } }
        val billsDeferred = async { runCatching { dashboardApiService.getMyMaintenance() } }
        val complaintsDeferred = async { runCatching { dashboardApiService.getMyComplaints() } }
        val noticesDeferred = async { runCatching { dashboardApiService.getLatestNotices() } }
        val session: UserSession? = sessionPreferences.readSession()

        val warnings = mutableListOf<String>()
        val dashboardResponse = dashboardDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body()
        val profile = dashboardResponse?.user ?: ProfileDto(
            id = session?.userId,
            name = session?.name,
            email = session?.email,
            phone = session?.phone,
            role = session?.role,
            status = session?.status,
            flatId = null,
            flatNo = null,
            wing = null,
            floorNo = null,
            flatStatus = null,
            societyName = null
        ).also { warnings.add("Fresh profile unavailable") }
        val bills = billsDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body()?.data ?: emptyList<MaintenanceBillDto>().also { warnings.add("Maintenance unavailable") }
        val complaints = complaintsDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body() ?: emptyList<ComplaintDto>().also { warnings.add("Complaints unavailable") }
        val notices = noticesDeferred.await().getOrNull()?.takeIf { it.isSuccessful }?.body() ?: emptyList<NoticeDto>().also { warnings.add("Notices unavailable") }
        val pendingBills = bills.filterNot { it.paymentStatus.equals("Paid", true) || it.status.equals("Paid", true) }
        val paidBills = bills.filter { it.paymentStatus.equals("Paid", true) || it.status.equals("Paid", true) }
        val currentBill = pendingBills.firstOrNull()
        val data = ResidentDashboardData(
            profile = profile,
            currentBill = currentBill,
            totalDue = pendingBills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal() },
            totalPaid = paidBills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.paidAmount ?: bill.totalAmount).toMoneyDecimal() },
            pendingBillCount = pendingBills.size,
            paidBillCount = paidBills.size,
            totalComplaints = complaints.size,
            openComplaints = complaints.count { it.status.equals("pending", true) },
            inProgressComplaints = complaints.count { it.status.equals("in_progress", true) },
            resolvedComplaints = complaints.count { it.status.equals("resolved", true) },
            latestNotices = notices.take(5),
            recentComplaints = complaints.take(3),
            warnings = warnings.distinct()
        )
        lastResidentDashboard = data
        DashboardLoadResult.Success(data, fromCache = false)
    }
}

sealed interface DashboardLoadResult<out T> {
    data class Success<T>(val data: T, val fromCache: Boolean) : DashboardLoadResult<T>
    data class Error(val message: String) : DashboardLoadResult<Nothing>
}

data class AdminDashboardData(
    val adminName: String,
    val totalResidents: Int,
    val totalFlats: Int,
    val occupiedFlats: Int,
    val vacantFlats: Int,
    val pendingRegistrations: Int,
    val totalBilled: BigDecimal,
    val collected: BigDecimal,
    val pending: BigDecimal,
    val paidBillCount: Int,
    val pendingBillCount: Int,
    val overdueBillCount: Int,
    val openComplaints: Int,
    val inProgressComplaints: Int,
    val resolvedComplaints: Int,
    val totalNotices: Int,
    val latestNotices: List<NoticeDto>,
    val recentComplaints: List<ComplaintDto>,
    val recentPayments: List<PaymentDto>,
    val warnings: List<String>
)

data class ResidentDashboardData(
    val profile: ProfileDto,
    val currentBill: MaintenanceBillDto?,
    val totalDue: BigDecimal,
    val totalPaid: BigDecimal,
    val pendingBillCount: Int,
    val paidBillCount: Int,
    val totalComplaints: Int,
    val openComplaints: Int,
    val inProgressComplaints: Int,
    val resolvedComplaints: Int,
    val latestNotices: List<NoticeDto>,
    val recentComplaints: List<ComplaintDto>,
    val warnings: List<String>
)

private fun String?.toMoneyDecimal(): BigDecimal {
    return try {
        this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
    } catch (_: Exception) {
        BigDecimal.ZERO
    }
}
