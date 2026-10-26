package com.example.ruwajay

import com.example.ruwajay.data.model.persistedImageUrls
import com.example.ruwajay.data.model.persistedCoordinates
import org.junit.Assert.*
import org.junit.Test

class SharedContractTest {
    @Test fun oldWebPhotosKeepOnlyPersistentUniqueUrls() {
        assertEquals(listOf("https://example.test/photo"), persistedImageUrls(mapOf(
            "fachada" to listOf("blob:http://localhost/photo","https://example.test/photo"),
            "general" to listOf("https://example.test/photo","data:image/png;base64,abc")
        )))
    }
    @Test fun locationModelKeepsMissingCoordinatesUnknown() {
        val location = com.example.ruwajay.data.model.Location(address="", zone="", city="")
        assertNull(location.coordinates)
        val point = com.example.ruwajay.data.model.Coordinates(0.0,0.0)
        assertEquals(point, location.copy(mapCoordinates=point).coordinates)
    }
    @Test fun unknownLocationDoesNotBecomeGuatemalaCity() {
        assertNull(persistedCoordinates(null))
        assertNull(persistedCoordinates(mapOf("lat" to 100,"lng" to 0)))
        assertEquals(0.0,persistedCoordinates(mapOf("lat" to 0,"lng" to 0))!!.lat,0.0)
        assertEquals(-90.5,persistedCoordinates(mapOf("latitude" to 14.6,"longitude" to -90.5))!!.lng,0.0)
    }
}
