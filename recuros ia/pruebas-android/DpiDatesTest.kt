package com.example.ruwajay

import com.example.ruwajay.data.model.DpiDates
import org.junit.Assert.*
import org.junit.Test
import java.util.TimeZone

class DpiDatesTest {
    @Test fun civilDatesKeepTheSameDayInEveryTimeZone() {
        val original = TimeZone.getDefault()
        try {
            for (zone in listOf("America/Guatemala", "Pacific/Kiritimati", "America/Los_Angeles", "UTC")) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone))
                assertEquals("2000-02-29", DpiDates.normalize("29/02/2000"))
                assertEquals("29/02/2000", DpiDates.display("2000-02-29"))
                assertEquals("2030-01-01", DpiDates.normalize("01/01/2030"))
            }
        } finally { TimeZone.setDefault(original) }
    }

    @Test fun invalidAndIncompleteDatesAreRejected() {
        for (value in listOf("", "29/02/2001", "31/04/2026", "2026-13-01", "2026-00-10", "00/01/2000", "1/2/2000", "2026-01-01T00:00:00Z", "31/01/2000x")) {
            assertNull(value, DpiDates.normalize(value))
        }
    }

    @Test fun birthAndExpirationMustDescribeAValidCurrentDocument() {
        val today = "2026-10-26"
        assertNull(DpiDates.validationError("01/01/2000", "26/10/2026", today))
        assertNotNull(DpiDates.validationError("", "2030-01-01", today))
        assertNotNull(DpiDates.validationError("2027-01-01", "2030-01-01", today))
        assertNotNull(DpiDates.validationError("2026-10-26", "2030-01-01", today))
        assertNotNull(DpiDates.validationError("2000-01-01", "2026-10-25", today))
        assertNotNull(DpiDates.validationError("1899-01-01", "2030-01-01", today))
    }
}
