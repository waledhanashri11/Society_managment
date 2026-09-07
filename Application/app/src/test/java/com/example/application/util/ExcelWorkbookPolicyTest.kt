package com.example.application.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ExcelWorkbookPolicyTest {
    @Test fun acceptsXlsxWorkbook() {
        assertNull(ExcelWorkbookPolicy.validate("transactions.xlsx", ExcelWorkbookPolicy.XLSX_MIME, 1024))
    }

    @Test fun rejectsWrongExtension() {
        assertEquals("Select an Excel .xlsx file.", ExcelWorkbookPolicy.validate("transactions.csv", "text/csv", 1024))
    }

    @Test fun rejectsEmptyWorkbook() {
        assertEquals("The selected workbook is empty.", ExcelWorkbookPolicy.validate("transactions.xlsx", ExcelWorkbookPolicy.XLSX_MIME, 0))
    }

    @Test fun rejectsOversizedWorkbook() {
        assertEquals("Workbook must be 10 MB or smaller.", ExcelWorkbookPolicy.validate("transactions.xlsx", ExcelWorkbookPolicy.XLSX_MIME, ExcelWorkbookPolicy.MAX_BYTES + 1))
    }
}
