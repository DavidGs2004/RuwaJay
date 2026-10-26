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
        ),
        Owner(
            id = "owner-3",
            name = "Ana Patricia Mejía",
            verified = true,
            rating = 4.7,
            responseTime = "~20 min",
            propertiesCount = 2,
            memberSince = "2024",
            online = true
        ),
        Owner(
            id = "owner-4",
            name = "Roberto Castillo",
            verified = true,
            rating = 4.9,
            responseTime = "~10 min",
            propertiesCount = 5,
            memberSince = "2022",
            online = false
        ),
        Owner(
            id = "owner-5",
            name = "Lucía Fernanda Ríos",
            verified = true,
            rating = 4.7,
            responseTime = "~25 min",
            propertiesCount = 3,
            memberSince = "2024",
            online = true
        )
    )

    val properties = listOf(
        Property(
            id = "prop-1",
            title = "Casa amplia con jardín en Zona 10",
            price = 4500.0,
            type = "casa",
            status = "disponible",
            description = "Hermosa casa de dos niveles en una de las zonas más exclusivas de la ciudad. Cuenta con un amplio jardín, área de parqueo para dos vehículos y acabados de primera calidad. Ideal para familias que buscan comodidad y seguridad en un entorno tranquilo.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 180.0, parking = 2),
            location = Location(
                address = "12 calle 5-45, Zona 10, Guatemala",
                zone = "Zona 10",
                city = "Ciudad de Guatemala",
                department = "Guatemala",
                municipality = "Guatemala",
                approximateAddress = "Zona 10, Guatemala",
                exactAddress = "12 calle 5-45, Zona 10, Guatemala",
                mapCoordinates = Coordinates(14.5925, -90.5130)
            ),
            ownerId = "owner-1",
            ownerName = "María Elena López",
            images = listOf(
                "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
                "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
                "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
            ),
            amenities = listOf("Agua constante", "Mantenimiento áreas comunes", "Jardín privado", "Seguridad"),
            rules = listOf("No fiestas grandes", "Horario de silencio a las 22:00"),
            requirements = listOf("DPI vigente", "Constancia de ingresos", "Un mes de depósito"),
            deposit = 4500.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-2",
            title = "Apartamento moderno en Zona 14",
            price = 6200.0,
            type = "apartamento",
            status = "disponible",
            description = "Apartamento contemporáneo en edificio con seguridad 24/7, gimnasio y piscina. Ubicado en la zona financiera con fácil acceso a centros comerciales, restaurantes y transporte. Pisos de porcelanato, cocina con isla y vista panorámica.",
            features = PropertyFeatures(bedrooms = 2, bathrooms = 2, area = 95.0, parking = 1),
            location = Location(
                address = "Edificio Torre Vista, 3a avenida 15-20, Zona 14",
                zone = "Zona 14",
                city = "Ciudad de Guatemala",
                department = "Guatemala",
                municipality = "Guatemala",
                approximateAddress = "Zona 14, Guatemala",
                exactAddress = "Edificio Torre Vista, 3a avenida 15-20, Zona 14",
                mapCoordinates = Coordinates(14.5815, -90.5210)
            ),
            ownerId = "owner-4",
            ownerName = "Roberto Castillo",
            images = listOf(
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
                "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&q=80"
            ),
            amenities = listOf("Gimnasio", "Piscina", "Seguridad 24/7", "Área social"),
            rules = listOf("No fumar", "Reglamento del edificio"),
            requirements = listOf("DPI vigente", "Constancia laboral", "Dos meses de depósito"),
            deposit = 6200.0,
            verified = true,
            isNew = false,
            patio = false,
            petsAllowed = false
        ),
        Property(
            id = "prop-3",
            title = "Casa familiar en San Cristóbal, Mixco",
            price = 3800.0,
            type = "casa",
            status = "disponible",
            description = "Casa cómoda y segura en residenciales de San Cristóbal. Perfecta para familias, con área verde compartida, acceso rápido a calzada San Juan y cerca de colegios y supermercados. Tres habitaciones amplias.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 140.0, parking = 1),
            location = Location(
                address = "Residenciales San Cristóbal, casa 45-B, Mixco",
                zone = "San Cristóbal",
                city = "Mixco",
                department = "Guatemala",
                municipality = "Mixco",
                approximateAddress = "Mixco, Guatemala",
                exactAddress = "Residenciales San Cristóbal, casa 45-B, Mixco",
                mapCoordinates = Coordinates(14.6340, -90.5920)
            ),
            ownerId = "owner-3",
            ownerName = "Ana Patricia Mejía",
            images = listOf(
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
                "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80",
                "https://images.unsplash.com/photo-1556909172-89cf0b8ffdc4?w=800&q=80"
            ),
            amenities = listOf("Agua", "Patio", "Área verde"),
            rules = listOf("Mascotas pequeñas permitidas", "Limpieza"),
            requirements = listOf("DPI vigente", "Fiador con propiedad", "Depósito de un mes"),
            deposit = 3800.0,
            verified = true,
            isNew = false,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-4",
            title = "Apartamento económico en Villa Nueva",
            price = 2900.0,
            type = "apartamento",
            status = "disponible",
            description = "Apartamento práctico y accesible en condominio cerrado de Villa Nueva. Incluye parqueo techado y áreas de juegos para niños. Ideal para parejas jóvenes o familias pequeñas.",
            features = PropertyFeatures(bedrooms = 2, bathrooms = 1, area = 65.0, parking = 1),
            location = Location(
                address = "Condominios del Valle, torre 3, apto 5B, Villa Nueva",
                zone = "Bárcenas",
                city = "Villa Nueva",
                department = "Guatemala",
                municipality = "Villa Nueva",
                approximateAddress = "Villa Nueva, Guatemala",
                exactAddress = "Condominios del Valle, torre 3, apto 5B, Villa Nueva",
                mapCoordinates = Coordinates(14.5255, -90.5950)
            ),
            ownerId = "owner-2",
            ownerName = "Carlos Hernández",
            images = listOf(
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"
            ),
            amenities = listOf("Agua", "Seguridad", "Parque infantil"),
            rules = listOf("No mascotas", "Máximo 4 ocupantes"),
            requirements = listOf("DPI vigente", "Recibo de servicio", "Un mes de depósito"),
            deposit = 2900.0,
            verified = true,
            isNew = true,
            patio = false,
            petsAllowed = false
        ),
        Property(
            id = "prop-5",
            title = "Casa colonial en Antigua Guatemala",
            price = 5500.0,
            type = "casa",
            status = "disponible",
            description = "Encantadora casa estilo colonial restaurada en el centro de Antigua Guatemala. Techos altos con vigas de madera, pisos de barro cocido y un hermoso patio interior con fuente. A pasos del Parque Central.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 200.0, parking = 0),
            location = Location(
                address = "4a calle oriente #15, Antigua Guatemala",
                zone = "Centro",
                city = "Antigua Guatemala",
                department = "Sacatepéquez",
                municipality = "Antigua Guatemala",
                approximateAddress = "Antigua Guatemala, Sacatepéquez",
                exactAddress = "4a calle oriente #15, Antigua Guatemala",
                mapCoordinates = Coordinates(14.5586, -90.7295)
            ),
            ownerId = "owner-4",
            ownerName = "Roberto Castillo",
            images = listOf(
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
                "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800&q=80"
            ),
            amenities = listOf("Patio con fuente", "Internet fibra óptica", "Estilo colonial"),
            rules = listOf("Preservar arquitectura", "Silencio colonial"),
            requirements = listOf("DPI o pasaporte", "Ingresos mínimos Q15,000", "Dos meses de depósito"),
            deposit = 8000.0,
            verified = true,
            isNew = false,
            patio = true,
            petsAllowed = false
        ),
        Property(
            id = "prop-7",
            title = "Casa acogedora en San Miguel Petapa",
            price = 2500.0,
            type = "casa",
            status = "disponible",
            description = "Casa de un nivel en colonia tranquila de San Miguel Petapa. Cuenta con tres habitaciones, patio amplio y acceso rápido a la carretera a Villa Nueva. Vecindario familiar y seguro.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 1, area = 110.0, parking = 1),
            location = Location(
                address = "Colonia Villa Hermosa, casa 12, San Miguel Petapa",
                zone = "Villa Hermosa",
                city = "San Miguel Petapa",
                department = "Guatemala",
                municipality = "San Miguel Petapa",
                approximateAddress = "San Miguel Petapa, Guatemala",
                exactAddress = "Colonia Villa Hermosa, casa 12, San Miguel Petapa",
                mapCoordinates = Coordinates(14.5025, -90.5570)
            ),
            ownerId = "owner-1",
            ownerName = "María Elena López",
            images = listOf(
                "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
                "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80"
            ),
            amenities = listOf("Agua", "Patio"),
            rules = listOf("Mascotas permitidas", "Cuidar la propiedad"),
            requirements = listOf("DPI vigente", "Fiador o depósito doble"),
            deposit = 2500.0,
            verified = false,
            isNew = false,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-11",
            title = "Residencia en condominio privado Oakland, Zona 10",
            price = 8500.0,
            type = "casa",
            status = "disponible",
            description = "Exclusiva residencia de dos niveles en Oakland, Zona 10. Cuenta con pérgola social, acabados de madera fina, cocina con isla de cuarzo y jardín privado. Condominio con estricta seguridad 24/7 y áreas verdes.",
            features = PropertyFeatures(bedrooms = 4, bathrooms = 3, area = 280.0, parking = 3),
            location = Location(
                address = "Diagonal 6, 14-80, Condominio Oakland, Zona 10",
                zone = "Zona 10",
                city = "Ciudad de Guatemala",
                department = "Guatemala",
                municipality = "Guatemala",
                approximateAddress = "Zona 10, Guatemala",
                exactAddress = "Diagonal 6, 14-80, Condominio Oakland, Zona 10",
                mapCoordinates = Coordinates(14.5980, -90.5090)
            ),
            ownerId = "owner-1",
            ownerName = "María Elena López",
            images = listOf(
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
                "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
                "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80"
            ),
            amenities = listOf("Agua potable 24h", "Seguridad 24/7 y garita", "Pérgola social", "Jardín privado"),
            rules = listOf("Mascotas permitidas según reglamento", "Control de sonido después de las 22:00"),
            requirements = listOf("DPI vigente", "Constancia de ingresos", "Un mes de depósito"),
            deposit = 8500.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-12",
            title = "Casa contemporánea cerca de Fontabella, Zona 10",
            price = 7200.0,
            type = "casa",
            status = "disponible",
            description = "Hermosa casa estilo contemporáneo a pasos de centros comerciales y zona médica. Amplia sala familiar con doble altura, estudio independiente para teletrabajo y terraza con vista a la ciudad.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 3, area = 220.0, parking = 2),
            location = Location(
                address = "4a avenida 12-30, Zona 10, Guatemala",
                zone = "Zona 10",
                city = "Ciudad de Guatemala",
                department = "Guatemala",
                municipality = "Guatemala",
                approximateAddress = "Zona 10, Guatemala",
                exactAddress = "4a avenida 12-30, Zona 10, Guatemala",
                mapCoordinates = Coordinates(14.5935, -90.5140)
            ),
            ownerId = "owner-4",
            ownerName = "Roberto Castillo",
            images = listOf(
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
                "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&q=80",
                "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&q=80"
            ),
            amenities = listOf("Agua constante", "Seguridad privada", "Estudio / Home Office", "Terraza"),
            rules = listOf("No fumar en interiores", "Horario de silencio"),
            requirements = listOf("DPI vigente", "Comprobante de ingresos", "Un mes de depósito"),
            deposit = 7200.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-13",
            title = "Casa de lujo con jardín privado en Las Conchas, Zona 14",
            price = 11500.0,
            type = "casa",
            status = "disponible",
            description = "Lujosa residencia unifamiliar en el prestigioso sector de Las Conchas, Zona 14. Espacios abiertos con pisos de madera de guayacán, amplia sala de estar con chimenea, pérgola para barbacoas y cuarto de servicio completo.",
            features = PropertyFeatures(bedrooms = 4, bathrooms = 4, area = 340.0, parking = 3),
            location = Location(
                address = "5a avenida y 18 calle, Las Conchas, Zona 14",
                zone = "Zona 14",
                city = "Ciudad de Guatemala",
                department = "Guatemala",
                municipality = "Guatemala",
                approximateAddress = "Zona 14, Guatemala",
                exactAddress = "5a avenida y 18 calle, Las Conchas, Zona 14",
                mapCoordinates = Coordinates(14.5760, -90.5195)
            ),
            ownerId = "owner-4",
            ownerName = "Roberto Castillo",
            images = listOf(
                "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80",
                "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
                "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80"
            ),
            amenities = listOf("Seguridad armada 24/7", "Jardín amplio", "Pérgola techada", "Agua de pozo propio"),
            rules = listOf("Uso exclusivamente residencial", "Cuidado de áreas verdes"),
            requirements = listOf("DPI o Pasaporte", "Ingresos demostrables", "Dos meses de depósito"),
            deposit = 11500.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-14",
            title = "Townhouse moderno en sector La Cañada, Zona 14",
            price = 8900.0,
            type = "casa",
            status = "disponible",
            description = "Elegante townhouse de tres niveles con acabados minimalistas en La Cañada, Zona 14. Cuenta con rooftop privado con vista panorámica, cocina equipada con isla central, climatización y garaje techado para dos vehículos.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 3, area = 215.0, parking = 2),
            location = Location(
                address = "Avenida Las Américas y 10a calle, Zona 14",
                zone = "Zona 14",
                city = "Ciudad de Guatemala",
                department = "Guatemala",
                municipality = "Guatemala",
                approximateAddress = "Zona 14, Guatemala",
                exactAddress = "Avenida Las Américas y 10a calle, Zona 14",
                mapCoordinates = Coordinates(14.5840, -90.5230)
            ),
            ownerId = "owner-2",
            ownerName = "Carlos Hernández",
            images = listOf(
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
                "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800&q=80",
                "https://images.unsplash.com/photo-1556909172-89cf0b8ffdc4?w=800&q=80"
            ),
            amenities = listOf("Garita de acceso con cámaras", "Rooftop privado", "Cocina de concepto abierto"),
            rules = listOf("Mascotas pequeñas permitidas", "No comercial"),
            requirements = listOf("DPI vigente", "Comprobante de ingresos", "Un mes de depósito"),
            deposit = 8900.0,
            verified = true,
            isNew = false,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-15",
            title = "Casa de dos niveles en Residenciales San Cristóbal, Mixco",
            price = 4200.0,
            type = "casa",
            status = "disponible",
            description = "Espaciosa y acogedora casa en sector B1 de San Cristóbal, Mixco. Cuenta con garita con control de acceso, jardín trasero con árboles frutales, cocina de cedro con desayunador y parqueo cerrado.",
            features = PropertyFeatures(bedrooms = 4, bathrooms = 2, area = 195.0, parking = 2),
            location = Location(
                address = "Boulevard San Cristóbal, Sector B1 Manzana G, Mixco",
                zone = "San Cristóbal",
                city = "Mixco",
                department = "Guatemala",
                municipality = "Mixco",
                approximateAddress = "Mixco, Guatemala",
                exactAddress = "Boulevard San Cristóbal, Sector B1 Manzana G, Mixco",
                mapCoordinates = Coordinates(14.6290, -90.5880)
            ),
            ownerId = "owner-3",
            ownerName = "Ana Patricia Mejía",
            images = listOf(
                "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80",
                "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80",
                "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
            ),
            amenities = listOf("Garita 24 horas", "Agua garantizada", "Jardín posterior"),
            rules = listOf("Mascotas permitidas", "Limpieza de áreas"),
            requirements = listOf("DPI vigente", "Constancia laboral", "Un mes de depósito"),
            deposit = 4200.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-16",
            title = "Casa moderna en Condado Naranjo, Mixco",
            price = 5400.0,
            type = "casa",
            status = "disponible",
            description = "Preciosa casa moderna dentro de exclusivo condominio en Condado Naranjo, Mixco. Casa club con piscina, canchas deportivas, senderos ecológicos y acceso inmediato al Anillo Periférico.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 175.0, parking = 2),
            location = Location(
                address = "Condominio Las Magnolias, Condado Naranjo, Mixco",
                zone = "El Naranjo",
                city = "Mixco",
                department = "Guatemala",
                municipality = "Mixco",
                approximateAddress = "Mixco, Guatemala",
                exactAddress = "Condominio Las Magnolias, Condado Naranjo, Mixco",
                mapCoordinates = Coordinates(14.6465, -90.5610)
            ),
            ownerId = "owner-5",
            ownerName = "Lucía Fernanda Ríos",
            images = listOf(
                "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
                "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80"
            ),
            amenities = listOf("Casa Club con piscina", "Gimnasio", "Canchas deportivas", "Seguridad perimetral"),
            rules = listOf("Mascotas permitidas", "Reglamento del condominio"),
            requirements = listOf("DPI vigente", "Comprobante de ingresos", "Un mes de depósito"),
            deposit = 5400.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-17",
            title = "Casa amplia en Planes de Bárcenas, Villa Nueva",
            price = 2800.0,
            type = "casa",
            status = "disponible",
            description = "Linda casa en condominio cerrado con amplias áreas recreativas para niños y salón social. Tres habitaciones con closets de madera, sala-comedor iluminada y patio techado con pila y área de lavandería.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 125.0, parking = 2),
            location = Location(
                address = "Residenciales Planes de Bárcenas, Sector Los Pinos, Villa Nueva",
                zone = "Bárcenas",
                city = "Villa Nueva",
                department = "Guatemala",
                municipality = "Villa Nueva",
                approximateAddress = "Villa Nueva, Guatemala",
                exactAddress = "Residenciales Planes de Bárcenas, Sector Los Pinos, Villa Nueva",
                mapCoordinates = Coordinates(14.4980, -90.6210)
            ),
            ownerId = "owner-2",
            ownerName = "Carlos Hernández",
            images = listOf(
                "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80",
                "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800&q=80",
                "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
            ),
            amenities = listOf("Seguridad con circuito cerrado", "Parque infantil", "Pozo propio"),
            rules = listOf("Mascotas educadas permitidas", "Normas de convivencia"),
            requirements = listOf("DPI vigente", "Constancia de ingresos", "Un mes de depósito"),
            deposit = 2800.0,
            verified = true,
            isNew = false,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-18",
            title = "Casa club en Condominio Fuentes del Valle, Villa Nueva",
            price = 3100.0,
            type = "casa",
            status = "disponible",
            description = "Casa familiar de 2 niveles ubicada en Condominio Fuentes del Valle II, Villa Nueva. Garita de acceso, canchas deportivas, excelente ventilación natural y cerca de transporte y centros de conveniencia.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 135.0, parking = 1),
            location = Location(
                address = "Condominio Fuentes del Valle II, Lote 18, Villa Nueva",
                zone = "Fuentes del Valle",
                city = "Villa Nueva",
                department = "Guatemala",
                municipality = "Villa Nueva",
                approximateAddress = "Villa Nueva, Guatemala",
                exactAddress = "Condominio Fuentes del Valle II, Lote 18, Villa Nueva",
                mapCoordinates = Coordinates(14.5150, -90.5820)
            ),
            ownerId = "owner-1",
            ownerName = "María Elena López",
            images = listOf(
                "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
                "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
                "https://images.unsplash.com/photo-1556909172-89cf0b8ffdc4?w=800&q=80"
            ),
            amenities = listOf("Agua constante", "Seguridad 24/7", "Áreas deportivas"),
            rules = listOf("Máximo 5 ocupantes", "Uso habitacional"),
            requirements = listOf("DPI vigente", "Recibo de servicios", "Un mes de depósito"),
            deposit = 3100.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-19",
            title = "Villa colonial con vista a los volcanes en Santa Ana, Antigua Guatemala",
            price = 7500.0,
            type = "casa",
            status = "disponible",
            description = "Espectacular villa colonial en la apacible aldea de Santa Ana, a solo 5 minutos del Parque Central de Antigua. Corredor español con columnas de madera tallada, búcaro colonial con agua corriente, chimenea en la sala principal y terraza con vista despejada hacia los volcanes de Agua, Fuego y Acatenango.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 3, area = 230.0, parking = 2),
            location = Location(
                address = "Calle de Santa Ana, Condominio El Cortijo #8, Antigua Guatemala",
                zone = "Santa Ana",
                city = "Antigua Guatemala",
                department = "Sacatepéquez",
                municipality = "Antigua Guatemala",
                approximateAddress = "Antigua Guatemala, Sacatepéquez",
                exactAddress = "Calle de Santa Ana, Condominio El Cortijo #8, Antigua Guatemala",
                mapCoordinates = Coordinates(14.5460, -90.7240)
            ),
            ownerId = "owner-4",
            ownerName = "Roberto Castillo",
            images = listOf(
                "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&q=80",
                "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=800&q=80",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
            ),
            amenities = listOf("Jardín colonial con búcaro", "Chimenea funcional", "Terraza panorámica", "Internet fibra óptica"),
            rules = listOf("Preservar la arquitectura colonial", "No fumar en habitaciones"),
            requirements = listOf("DPI o Pasaporte", "Ingresos comprobables", "Un mes de depósito"),
            deposit = 7500.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-20",
            title = "Residencia colonial con patio empedrado en San Pedro Las Huertas, Antigua Guatemala",
            price = 5200.0,
            type = "casa",
            status = "disponible",
            description = "Hermosa casa estilo colonial con techos de teja artesanal, detalles de hierro forjado y patio empedrado tradicional con buganvilias. En entorno seguro y tranquilo con aire fresco y clima templado.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 160.0, parking = 1),
            location = Location(
                address = "Calle Real hacia la Iglesia, San Pedro Las Huertas, Antigua Guatemala",
                zone = "San Pedro Las Huertas",
                city = "Antigua Guatemala",
                department = "Sacatepéquez",
                municipality = "Antigua Guatemala",
                approximateAddress = "Antigua Guatemala, Sacatepéquez",
                exactAddress = "Calle Real hacia la Iglesia, San Pedro Las Huertas, Antigua Guatemala",
                mapCoordinates = Coordinates(14.5290, -90.7290)
            ),
            ownerId = "owner-3",
            ownerName = "Ana Patricia Mejía",
            images = listOf(
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
                "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800&q=80"
            ),
            amenities = listOf("Patio colonial", "Cocina tradicional", "Seguridad vecinal", "Agua incluida"),
            rules = listOf("Mascotas bienvenidas", "Cuidado de plantas"),
            requirements = listOf("DPI o Pasaporte", "Comprobante de ingresos", "Un mes de depósito"),
            deposit = 5200.0,
            verified = true,
            isNew = false,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-21",
            title = "Casa moderna en Condominio Los Álamos, San Miguel Petapa",
            price = 2700.0,
            type = "casa",
            status = "disponible",
            description = "Casa moderna de dos niveles en Condominio Residencial Los Álamos, San Miguel Petapa. Garita de acceso controlado, parque infantil, cocina equipada con gabinetes modernos, calentador general de agua y patio trasero.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 120.0, parking = 2),
            location = Location(
                address = "Condominio Los Álamos, Manzana 4 Casa 15, San Miguel Petapa",
                zone = "Los Álamos",
                city = "San Miguel Petapa",
                department = "Guatemala",
                municipality = "San Miguel Petapa",
                approximateAddress = "San Miguel Petapa, Guatemala",
                exactAddress = "Condominio Los Álamos, Manzana 4 Casa 15, San Miguel Petapa",
                mapCoordinates = Coordinates(14.4985, -90.5480)
            ),
            ownerId = "owner-5",
            ownerName = "Lucía Fernanda Ríos",
            images = listOf(
                "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
                "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80",
                "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
            ),
            amenities = listOf("Garita de seguridad", "Área social infantil", "Calentador solar", "Agua 24h"),
            rules = listOf("Mascotas permitidas", "Tranquilidad vecinal"),
            requirements = listOf("DPI vigente", "Constancia de ingresos", "Un mes de depósito"),
            deposit = 2700.0,
            verified = true,
            isNew = true,
            patio = true,
            petsAllowed = true
        ),
        Property(
            id = "prop-22",
            title = "Casa familiar de 2 niveles en Riveras del Río, San Miguel Petapa",
            price = 2950.0,
            type = "casa",
            status = "disponible",
            description = "Cómoda y amplia casa familiar dentro de condominio seguro en Riveras del Río, San Miguel Petapa. Sala independiente, comedor con vista al patio interior, dormitorio principal con baño privado y balcón.",
            features = PropertyFeatures(bedrooms = 3, bathrooms = 2, area = 140.0, parking = 2),
            location = Location(
                address = "Residenciales Riveras del Río, Sector 2, San Miguel Petapa",
                zone = "Riveras del Río",
                city = "San Miguel Petapa",
                department = "Guatemala",
                municipality = "San Miguel Petapa",
                approximateAddress = "San Miguel Petapa, Guatemala",
                exactAddress = "Residenciales Riveras del Río, Sector 2, San Miguel Petapa",
                mapCoordinates = Coordinates(14.5090, -90.5620)
            ),
            ownerId = "owner-1",
            ownerName = "María Elena López",
            images = listOf(
                "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800&q=80",
                "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80",
                "https://images.unsplash.com/photo-1556909172-89cf0b8ffdc4?w=800&q=80"
            ),
            amenities = listOf("Seguridad con rondas 24/7", "Balcón principal", "Patio con lavandería"),
            rules = listOf("Mascotas permitidas", "Uso residencial"),
            requirements = listOf("DPI vigente", "Constancia laboral", "Un mes de depósito"),
            deposit = 2950.0,
            verified = true,
            isNew = false,
            patio = true,
            petsAllowed = true
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
        ),
        Review(
            id = "rev-11-1",
            propertyId = "prop-11",
            userName = "Fernando Asturias",
            rating = 5.0,
            date = "14 de Febrero, 2026",
            verifiedTenant = true,
            comment = "La casa en Oakland es excepcional. La pérgola es perfecta para reuniones familiares y la seguridad del condominio brinda total tranquilidad.",
            tags = listOf("Garita estricta", "Acabados de lujo", "Zona 10 tranquila")
        ),
        Review(
            id = "rev-13-1",
            propertyId = "prop-13",
            userName = "Marcela Coronado",
            rating = 4.9,
            date = "20 de Enero, 2026",
            verifiedTenant = true,
            comment = "Vivir en Las Conchas es una experiencia de primer nivel. El jardín es inmenso y los techos altos mantienen la casa fresca todo el año.",
            tags = listOf("Exclusividad", "Jardín amplio", "Zona 14")
        ),
        Review(
            id = "rev-15-1",
            propertyId = "prop-15",
            userName = "Eduardo Samayoa",
            rating = 4.8,
            date = "10 de Enero, 2026",
            verifiedTenant = true,
            comment = "Excelente casa familiar en San Cristóbal. Todo queda cerca: centros comerciales, colegios y supermercados. El agua nunca falta.",
            tags = listOf("Agua constante", "Ambiente familiar", "Garita 24/7")
        ),
        Review(
            id = "rev-19-1",
            propertyId = "prop-19",
            userName = "Beatriz Molina",
            rating = 5.0,
            date = "3 de Febrero, 2026",
            verifiedTenant = true,
            comment = "La vista a los volcanes desde la terraza de Santa Ana es inigualable. El búcaro y el jardín colonial le dan una paz única a la propiedad.",
            tags = listOf("Vistas a los volcanes", "Ambiente colonial", "Antigua Guatemala")
        ),
        Review(
            id = "rev-21-1",
            propertyId = "prop-21",
            userName = "Gustavo Arévalo",
            rating = 4.7,
            date = "22 de Enero, 2026",
            verifiedTenant = true,
            comment = "Muy buena opción en Petapa. El condominio es ordenado, los niños juegan seguros en el parque y el acceso hacia la VAS es súper rápido.",
            tags = listOf("Condominio seguro", "Buena ubicación", "Precio justo")
        )
    )
}
