package com.example.application.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.example.application.data.local.entity.CacheMetadataEntity

@Dao
interface CacheMetadataDao {
    @Query("SELECT * FROM cache_metadata WHERE cacheKey = :cacheKey LIMIT 1")
    suspend fun getCacheMetadata(cacheKey: String): CacheMetadataEntity?

    @Upsert
    suspend fun upsertCacheMetadata(cacheMetadata: CacheMetadataEntity)

    @Query("DELETE FROM cache_metadata WHERE cacheKey = :cacheKey")
    suspend fun deleteCacheMetadata(cacheKey: String)
}
