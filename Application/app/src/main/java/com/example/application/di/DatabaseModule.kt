package com.example.application.di

import android.content.Context
import androidx.room.Room
import com.example.application.data.local.dao.CacheMetadataDao
import com.example.application.data.local.database.AppDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "society_management.db"
        ).build()
    }

    @Provides
    fun provideCacheMetadataDao(appDatabase: AppDatabase): CacheMetadataDao {
        return appDatabase.cacheMetadataDao()
    }
}
