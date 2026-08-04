package com.example.application

import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.grossBillAmount
import com.example.application.data.remote.dto.maintenanceChargeAmount
import com.example.application.data.remote.dto.netBillAmountValue
import com.example.application.data.remote.dto.netPayableAmount
import com.example.application.data.remote.dto.penaltyChargeAmount
import com.example.application.data.remote.dto.totalWriteOffAmountValue
import java.math.BigDecimal
import org.junit.Assert.assertEquals
import org.junit.Test

class MaintenanceBillCalculationTest {

    @Test
    fun test1_prasadWriteOff() {
        val bill = MaintenanceBillDto(
            id = "101",
            title = "Maintenance - August 2026",
            month = "8",
            year = "2026",
            amount = "2500",
            penaltyAmount = "100",
            totalAmount = "2600",
            maintenanceWriteOffAmount = "600",
            penaltyWriteOffAmount = "0",
            paidAmount = "0",
            status = "PARTIAL_WRITE_OFF",
            dueDate = "2026-08-01"
        )

        assertEquals(BigDecimal("2500"), bill.maintenanceChargeAmount())
        assertEquals(BigDecimal("100"), bill.penaltyChargeAmount())
        assertEquals(BigDecimal("2600"), bill.grossBillAmount())
        assertEquals(BigDecimal("600"), bill.totalWriteOffAmountValue())
        assertEquals(BigDecimal("2000"), bill.netBillAmountValue())
        assertEquals(BigDecimal("2000"), bill.netPayableAmount())
    }

    @Test
    fun test2_partialPayment() {
        val bill = MaintenanceBillDto(
            id = "102",
            title = "Maintenance - August 2026",
            amount = "2500",
            penaltyAmount = "100",
            maintenanceWriteOffAmount = "600",
            paidAmount = "1200",
            status = "PARTIALLY_PAID"
        )

        assertEquals(BigDecimal("2000"), bill.netBillAmountValue())
        assertEquals(BigDecimal("800"), bill.netPayableAmount())
    }

    @Test
    fun test3_fullPayment() {
        val bill = MaintenanceBillDto(
            id = "103",
            title = "Maintenance - August 2026",
            amount = "2500",
            penaltyAmount = "100",
            maintenanceWriteOffAmount = "600",
            paidAmount = "2000",
            status = "PAID"
        )

        assertEquals(BigDecimal("2000"), bill.netBillAmountValue())
        assertEquals(BigDecimal("0"), bill.netPayableAmount())
    }

    @Test
    fun test4_pendingPayment() {
        // Pending payments do not reduce netPayableAmount until admin approves
        val bill = MaintenanceBillDto(
            id = "104",
            title = "Maintenance - August 2026",
            amount = "2500",
            penaltyAmount = "100",
            maintenanceWriteOffAmount = "600",
            paidAmount = "0",
            status = "Pending Verification"
        )

        assertEquals(BigDecimal("2000"), bill.netBillAmountValue())
        assertEquals(BigDecimal("2000"), bill.netPayableAmount())
    }

    @Test
    fun test5_rejectedWriteOff() {
        // Rejected write off (maintenanceWriteOffAmount = 0)
        val bill = MaintenanceBillDto(
            id = "105",
            amount = "2500",
            penaltyAmount = "100",
            maintenanceWriteOffAmount = "0",
            paidAmount = "0",
            status = "Pending"
        )

        assertEquals(BigDecimal("2600"), bill.grossBillAmount())
        assertEquals(BigDecimal("2600"), bill.netPayableAmount())
    }

    @Test
    fun test6_penaltyWriteOff() {
        val bill = MaintenanceBillDto(
            id = "106",
            amount = "2500",
            penaltyAmount = "100",
            maintenanceWriteOffAmount = "0",
            penaltyWriteOffAmount = "100",
            paidAmount = "0"
        )

        assertEquals(BigDecimal("2600"), bill.grossBillAmount())
        assertEquals(BigDecimal("100"), bill.totalWriteOffAmountValue())
        assertEquals(BigDecimal("2500"), bill.netBillAmountValue())
        assertEquals(BigDecimal("2500"), bill.netPayableAmount())
    }

    @Test
    fun test7_noDuplicatePenalty() {
        val bill = MaintenanceBillDto(
            id = "107",
            amount = "2500",
            penaltyAmount = "100",
            totalAmount = "2600"
        )

        assertEquals(BigDecimal("2600"), bill.grossBillAmount())
        assertEquals(BigDecimal("2600"), bill.netPayableAmount())
    }

    @Test
    fun test8_multipleBillsTotalDue() {
        val billA = MaintenanceBillDto(id = "A", amount = "2500", penaltyAmount = "100", maintenanceWriteOffAmount = "600")
        val billB = MaintenanceBillDto(id = "B", amount = "500", penaltyAmount = "0")

        val totalDue = listOf(billA, billB).fold(BigDecimal.ZERO) { sum, b -> sum + b.netPayableAmount() }

        assertEquals(BigDecimal("2500"), totalDue)
    }
}
