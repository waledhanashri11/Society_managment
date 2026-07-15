package com.example.application.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.application.data.local.dao.CacheMetadataDao
import com.example.application.data.local.entity.CacheMetadataEntity

@Database(
    entities = [CacheMetadataEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun cacheMetadataDao(): CacheMetadataDao
}
