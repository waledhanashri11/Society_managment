package com.example.application.di

import com.example.application.BuildConfig
import com.example.application.data.remote.api.HealthApiService
import com.example.application.data.remote.api.AdminManagementApiService
import com.example.application.data.remote.api.AuthApiService
import com.example.application.data.remote.api.MaintenanceApiService
import com.example.application.data.remote.api.CommunicationApiService
import com.example.application.data.remote.api.FlatApiService
import com.example.application.data.remote.api.ReportsApiService
import com.example.application.data.remote.api.ResidentApiService
import com.example.application.data.remote.api.DashboardApiService
import com.example.application.data.remote.interceptor.AcceptHeaderInterceptor
import com.example.application.data.remote.interceptor.AuthHeaderInterceptor
import com.example.application.data.remote.interceptor.SessionExpiryInterceptor
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    private const val TIMEOUT_SECONDS = 30L

    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder().create()
    }

    @Provides
    @Singleton
    fun provideHttpLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.HEADERS
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        acceptHeaderInterceptor: AcceptHeaderInterceptor,
        authHeaderInterceptor: AuthHeaderInterceptor,
        sessionExpiryInterceptor: SessionExpiryInterceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .addInterceptor(acceptHeaderInterceptor)
            .addInterceptor(authHeaderInterceptor)
            .addInterceptor(loggingInterceptor)
            .addInterceptor(sessionExpiryInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        gson: Gson,
        okHttpClient: OkHttpClient
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideHealthApiService(retrofit: Retrofit): HealthApiService {
        return retrofit.create(HealthApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService {
        return retrofit.create(AuthApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideFlatApiService(retrofit: Retrofit): FlatApiService {
        return retrofit.create(FlatApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideResidentApiService(retrofit: Retrofit): ResidentApiService {
        return retrofit.create(ResidentApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideDashboardApiService(retrofit: Retrofit): DashboardApiService {
        return retrofit.create(DashboardApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAdminManagementApiService(retrofit: Retrofit): AdminManagementApiService {
        return retrofit.create(AdminManagementApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideMaintenanceApiService(retrofit: Retrofit): MaintenanceApiService {
        return retrofit.create(MaintenanceApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideCommunicationApiService(retrofit: Retrofit): CommunicationApiService {
        return retrofit.create(CommunicationApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideReportsApiService(retrofit: Retrofit): ReportsApiService {
        return retrofit.create(ReportsApiService::class.java)
    }
}
