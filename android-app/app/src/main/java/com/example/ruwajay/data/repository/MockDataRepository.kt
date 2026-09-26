package com.example.ruwajay.data.repository

import com.example.ruwajay.data.model.Coordinates
import com.example.ruwajay.data.model.Location
import com.example.ruwajay.data.model.Owner
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.data.model.PropertyFeatures
import com.example.ruwajay.data.model.Review
import com.example.ruwajay.data.model.Conversation
import com.example.ruwajay.data.model.Message

object MockDataRepository {
    
    val owners = listOf(
        Owner(
            id = "owner-1",
            name = "María Elena López",
            verified = true,
            rating = 4.8,
            responseTime = "~15 min",
            propertiesCount = 3,
            memberSince = "2024",
            online = true
        ),
        Owner(
            id = "owner-2",
            name = "Carlos Hernández",
            verified = true,
            rating = 4.6,
            responseTime = "~30 min",
            propertiesCount = 2,
            memberSince = "2023",
            online = false
        )
    )

    val properties = listOf(
        Property(
            id = "prop-1",
            title = "Casa moderna en zona residencial exclusiva",
            price = 6500,
            type = "casa",
            status = "disponible",
            description = "Hermosa casa de diseño moderno ubicada en condominio seguro. Ideal para familias que buscan tranquilidad sin alejarse de la ciudad. Cuenta con acabados de primera, jardín amplio y seguridad 24/7.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 180),
            location = Location(
                address = "Residenciales Vista Linda, Lote 45",
                zone = "Zona 15",
                city = "Ciudad de Guatemala",
                mapCoordinates = Coordinates(14.595, -90.485)
            ),
            ownerId = "owner-1",
            images = listOf(
                "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
                "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80"
            ),
            amenities = listOf("Jardín", "Parqueo techado", "Seguridad 24/7", "Pet friendly"),
            rules = listOf("No fiestas grandes", "Mantenimiento al día"),
            requirements = listOf("Contrato 1 año", "Depósito 1 mes")
        ),
        Property(
            id = "prop-2",
            title = "Apartamento tipo Loft con vista a los volcanes",
            price = 4200,
            type = "apartamento",
            status = "disponible",
            description = "Elegante apartamento loft en piso alto. Iluminación natural increíble, ventanales de piso a techo y balcón amplio. Cerca de centros comerciales, universidades y áreas corporativas.",
            features = PropertyFeatures(bedrooms = 1, bathrooms = 1, area = 75),
            location = Location(
                address = "Torre Vistas, Nivel 14",
                zone = "Zona 14",
                city = "Ciudad de Guatemala",
                mapCoordinates = Coordinates(14.580, -90.515)
            ),
            ownerId = "owner-2",
            images = listOf(
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80"
            ),
            amenities = listOf("Gimnasio", "Piscina", "Rooftop", "Amueblado"),
            rules = listOf("No fumar", "Solo mascotas pequeñas"),
            requirements = listOf("Fiador", "Constancia de ingresos")
        ),
        Property(
            id = "prop-3",
            title = "Casa colonial restaurada",
            price = 5800,
            type = "casa",
            status = "reservada",
            description = "Casa de estilo colonial con detalles auténticos, patio central con fuente de agua, y terraza española.",
            features = PropertyFeatures(bedrooms = 2, bathrooms = 2, area = 150),
            location = Location(
                address = "Calle de los pasos, #21",
                zone = "Centro",
                city = "Antigua Guatemala",
                mapCoordinates = Coordinates(14.555, -90.733)
            ),
            ownerId = "owner-1",
            images = listOf(
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
            ),
            amenities = listOf("Jardín interior", "Chimenea", "Cerca del centro"),
            rules = listOf("No hacer ruido después de 10pm"),
            requirements = listOf("Contrato mínimo 6 meses")
        )
    )

    val conversations = listOf(
        com.example.ruwajay.data.model.Conversation(
            id = "conv-prop-1",
            propertyId = "prop-1",
            ownerId = "owner-1",
            participantName = "María Elena López",
            participantOnline = true,
            participantPhone = "+502 5482 9104",
            participantRole = "Arrendante Verificada",
            unreadCount = 1,
            lastMessage = "¡Hola! Con gusto te muestro la casa en Zona 10. ¿Qué día te queda mejor?",
            lastMessageTimestamp = "10:32 a.m.",
            messages = listOf(
                com.example.ruwajay.data.model.Message(
                    id = "msg-1",
                    senderId = "user-demo",
                    isUser = true,
                    senderName = "Tú",
                    text = "¡Hola María Elena! Me interesa la casa amplia con jardín en Zona 10. ¿Aún sigue disponible?",
                    timestamp = "10:30 a.m.",
                    status = "read"
                ),
                com.example.ruwajay.data.model.Message(
                    id = "msg-2",
                    senderId = "owner-1",
                    isUser = false,
                    senderName = "María Elena López",
                    text = "¡Hola! Con gusto te muestro la casa en Zona 10. ¿Qué día te queda mejor?",
                    timestamp = "10:32 a.m.",
                    status = "delivered"
                )
            )
        ),
        com.example.ruwajay.data.model.Conversation(
            id = "conv-prop-2",
            propertyId = "prop-2",
            ownerId = "owner-2",
            participantName = "Carlos Hernández",
            participantOnline = true,
            participantPhone = "+502 4192 8301",
            participantRole = "Propietario en Zona 14",
            unreadCount = 0,
            lastMessage = "El edificio cuenta con garita 24/7 y la mensualidad ya incluye la cuota de mantenimiento.",
            lastMessageTimestamp = "Ayer",
            messages = listOf(
                com.example.ruwajay.data.model.Message(
                    id = "msg-p2-1",
                    senderId = "user-demo",
                    isUser = true,
                    senderName = "Tú",
                    text = "Buenas tardes Carlos, ¿el apartamento en Zona 14 incluye parqueo y mantenimiento?",
                    timestamp = "Ayer 4:15 p.m.",
                    status = "read"
                ),
                com.example.ruwajay.data.model.Message(
                    id = "msg-p2-2",
                    senderId = "owner-2",
                    isUser = false,
                    senderName = "Carlos Hernández",
                    text = "El edificio cuenta con garita 24/7 y la mensualidad ya incluye la cuota de mantenimiento.",
                    timestamp = "Ayer 4:20 p.m.",
                    status = "read"
                )
            )
        ),
        com.example.ruwajay.data.model.Conversation(
            id = "conv-prop-3",
            propertyId = "prop-3",
            ownerId = "owner-3",
            participantName = "Ana Patricia Mejía",
            participantOnline = false,
            participantPhone = "+502 5901 4478",
            participantRole = "Arrendante en Antigua",
            unreadCount = 0,
            lastMessage = "La casa colonial en Antigua está lista para habitar inmediatamente.",
            lastMessageTimestamp = "14 de Sep",
            messages = listOf(
                com.example.ruwajay.data.model.Message(
                    id = "msg-p3-1",
                    senderId = "user-demo",
                    isUser = true,
                    senderName = "Tú",
                    text = "Hola doña Ana, ¿la casa colonial en Antigua tiene patio con fuente?",
                    timestamp = "14 de Sep 11:00 a.m.",
                    status = "read"
                ),
                com.example.ruwajay.data.model.Message(
                    id = "msg-p3-2",
                    senderId = "owner-3",
                    isUser = false,
                    senderName = "Ana Patricia Mejía",
                    text = "La casa colonial en Antigua está lista para habitar inmediatamente.",
                    timestamp = "14 de Sep 11:15 a.m.",
                    status = "read"
                )
            )
        )
    )

    val reviews = mutableListOf(
        Review(
            id = "seed-prop-1-1",
            propertyId = "prop-1",
            userName = "Carlos Marroquín",
            rating = 4.9,
            date = "10 de Enero, 2026",
            verifiedTenant = true,
            comment = "La propiedad superó mis expectativas. Todo muy limpio, seguro y el contrato fue claro y sin sorpresas.",
            tags = listOf("Zona muy segura", "Agua constante", "Excelente ubicación")
        ),
        Review(
            id = "seed-prop-1-2",
            propertyId = "prop-1",
            userName = "Ana López",
            rating = 4.8,
            date = "5 de Noviembre, 2025",
            verifiedTenant = true,
            comment = "Excelente ambiente y parqueo amplio. El propietario siempre estuvo atento.",
            tags = listOf("Parqueo amplio", "Trato amable")
        ),
        Review(
            id = "seed-prop-2-1",
            propertyId = "prop-2",
            userName = "Luis García",
            rating = 4.6,
            date = "15 de Febrero, 2026",
            verifiedTenant = false,
            comment = "Buena iluminación y zona tranquila. Recomendado para parejas.",
            tags = listOf("Buena iluminación", "Ambiente tranquilo")
        )
    )
}
