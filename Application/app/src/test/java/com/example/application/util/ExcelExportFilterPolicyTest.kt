package com.example.application.util

import com.example.application.data.remote.dto.ExcelTransactionFilters
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ExcelExportFilterPolicyTest {
    @Test fun acceptsNoFilters() {
        assertNull(ExcelExportFilterPolicy.validate(ExcelTransactionFilters()))
    }

    @Test fun rejectsMalformedDate() {
        assertEquals(
            "From date must use YYYY-MM-DD.",
            ExcelExportFilterPolicy.validate(ExcelTransactionFilters(from = "26/08/2026"))
        )
    }

    @Test fun rejectsReversedDates() {
        assertEquals(
            "From date cannot be after To date.",
            ExcelExportFilterPolicy.validate(ExcelTransactionFilters(from = "2026-08-31", to = "2026-08-01"))
        )
    }
}
