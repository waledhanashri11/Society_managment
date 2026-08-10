package com.example.application.data.repository

import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.remote.api.DashboardApiService
import com.example.application.data.remote.api.ResidentApiService
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.PaymentDto
import com.example.application.data.remote.dto.ProfileDto
import java.math.BigDecimal
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@Singleton
class DashboardRepository @Inject constructor(
    private val dashboardApiService: DashboardApiService,
    private val residentApiService: ResidentApiService,
    private val sessionPreferences: SessionPreferences
) {
    private var lastAdminDashboard: AdminDashboardData? = null
    private var lastResidentDashboard: ResidentDashboardData? = null
    private var adminLoadedAt = 0L
    private var residentLoadedAt = 0L
    private val adminLoadMutex = Mutex()
    private val residentLoadMutex = Mutex()

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

    suspend fun getAdminDashboard(refresh: Boolean = false): DashboardLoadResult<AdminDashboardData> {
        val observedLoadedAt = adminLoadedAt
        return adminLoadMutex.withLock {
            val cached = lastAdminDashboard
            val fresh = System.currentTimeMillis() - adminLoadedAt < CACHE_TTL_MS
            if (cached != null && ((!refresh && fresh) || adminLoadedAt > observedLoadedAt)) {
                return@withLock DashboardLoadResult.Success(cached, fromCache = true)
            }
            try {
                val response = dashboardApiService.getAdminDashboard()
                val dto = response.body()
                if (!response.isSuccessful || dto == null) {
                    return@withLock DashboardLoadResult.Error("Unable to refresh dashboard (${response.code()})")
                }
                val data = AdminDashboardData(
                    adminName = dto.adminName?.ifBlank { "Admin" } ?: "Admin",
                    totalResidents = dto.totalResidents ?: 0,
                    totalFlats = dto.totalFlats ?: 0,
                    occupiedFlats = dto.occupiedFlats ?: 0,
                    vacantFlats = dto.vacantFlats ?: 0,
                    pendingRegistrations = dto.pendingRegistrations ?: 0,
                    totalBilled = dto.totalBilled.toMoneyDecimal(),
                    collected = dto.collected.toMoneyDecimal(),
                    pending = dto.pending.toMoneyDecimal(),
                    paidBillCount = dto.paidBillCount ?: 0,
                    pendingBillCount = dto.pendingBillCount ?: 0,
                    overdueBillCount = dto.overdueBillCount ?: 0,
                    openComplaints = dto.openComplaints ?: 0,
                    inProgressComplaints = dto.inProgressComplaints ?: 0,
                    resolvedComplaints = dto.resolvedComplaints ?: 0,
                    totalNotices = dto.totalNotices ?: 0,
                    latestNotices = dto.latestNotices.orEmpty(),
                    recentComplaints = dto.recentComplaints.orEmpty(),
                    recentPayments = dto.recentPayments.orEmpty(),
                    warnings = emptyList()
                )
                lastAdminDashboard = data
                adminLoadedAt = System.currentTimeMillis()
                DashboardLoadResult.Success(data, fromCache = false)
            } catch (error: Exception) {
                DashboardLoadResult.Error(error.message ?: "Unable to refresh dashboard")
            }
        }
    }

    suspend fun getResidentDashboard(refresh: Boolean = false): DashboardLoadResult<ResidentDashboardData> {
        val observedLoadedAt = residentLoadedAt
        return residentLoadMutex.withLock {
            val cached = lastResidentDashboard
            val fresh = System.currentTimeMillis() - residentLoadedAt < CACHE_TTL_MS
            if (cached != null && ((!refresh && fresh) || residentLoadedAt > observedLoadedAt)) {
                return@withLock DashboardLoadResult.Success(cached, fromCache = true)
            }
            try {
                val response = residentApiService.getDashboard()
                val body = response.body()
                if (!response.isSuccessful || body?.user == null) {
                    return@withLock DashboardLoadResult.Error("Unable to refresh dashboard (${response.code()})")
                }
                val summary = body.summary
                val data = ResidentDashboardData(
                    profile = body.user,
                    currentBill = body.currentBill,
                    totalDue = summary?.pendingAmount.toMoneyDecimal(),
                    totalPaid = summary?.paidAmount.toMoneyDecimal(),
                    pendingBillCount = summary?.pendingBills ?: 0,
                    paidBillCount = summary?.paidBills ?: 0,
                    totalComplaints = summary?.totalComplaints ?: 0,
                    openComplaints = summary?.openComplaints ?: 0,
                    inProgressComplaints = summary?.inProgressComplaints ?: 0,
                    resolvedComplaints = summary?.resolvedComplaints ?: 0,
                    latestNotices = body.latestNotices.orEmpty(),
                    recentComplaints = body.recentComplaints.orEmpty(),
                    warnings = emptyList()
                )
                lastResidentDashboard = data
                residentLoadedAt = System.currentTimeMillis()
                DashboardLoadResult.Success(data, fromCache = false)
            } catch (error: Exception) {
                DashboardLoadResult.Error(error.message ?: "Unable to refresh dashboard")
            }
        }
    }

    fun clearCache() {
        lastAdminDashboard = null
        lastResidentDashboard = null
        adminLoadedAt = 0L
        residentLoadedAt = 0L
    }
}

private const val CACHE_TTL_MS = 30_000L

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
