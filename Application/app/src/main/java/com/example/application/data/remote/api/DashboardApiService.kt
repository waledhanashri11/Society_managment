package com.example.application.data.remote.api

import com.example.application.data.remote.dto.ApiListResponse
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.PaymentDto
import com.example.application.data.remote.dto.UserSummaryDto
import retrofit2.Response
import retrofit2.http.GET

interface DashboardApiService {
    @GET("api/users")
    suspend fun getUsers(): Response<List<UserSummaryDto>>

    @GET("api/flats")
    suspend fun getFlats(): Response<List<FlatDto>>

    @GET("api/maintenance/bills")
    suspend fun getMaintenanceBills(): Response<ApiListResponse<MaintenanceBillDto>>

    @GET("api/maintenance/user/my-maintenance")
    suspend fun getMyMaintenance(): Response<ApiListResponse<MaintenanceBillDto>>

    @GET("api/maintenance/payments")
    suspend fun getPayments(): Response<ApiListResponse<PaymentDto>>

    @GET("api/complaints")
    suspend fun getComplaints(): Response<List<ComplaintDto>>

    @GET("api/complaints/user/my-complaints")
    suspend fun getMyComplaints(): Response<List<ComplaintDto>>

    @GET("api/notices")
    suspend fun getNotices(): Response<List<NoticeDto>>

    @GET("api/notices/latest")
    suspend fun getLatestNotices(): Response<List<NoticeDto>>
}
