import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { formatPrice, formatDistance, calculateDistance } from '../../data/properties';
import { MapPin, Bed, Bath, ArrowRight, Heart } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';

// Custom SVG Icons for Leaflet
const createCustomIcon = (type, price, isSelected = false) => {
  const isCasa = type === 'casa';
  const bg = isSelected ? '#E54B22' : isCasa ? '#0B5D3B' : '#168A55';
  
  const svg = `
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
      <g filter="url(#shadow)">
        <path d="M22 2C12.6 2 5 9.6 5 19C5 29.5 22 42 22 42C22 42 39 29.5 39 19C39 9.6 31.4 2 22 2Z" fill="${bg}"/>
        <circle cx="22" cy="18" r="10" fill="#FFF5E8"/>
        ${
          isCasa
            ? '<path d="M22 11L15 17V23H29V17L22 11Z" fill="#3B2118"/>'
            : '<rect x="17" y="12" width="10" height="12" rx="1" fill="#3B2118"/>'
        }
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -40],
  });
};

// Controller to invalidate size and adjust map view
function MapController({ center, zoom, focusCoordinates }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  const targetLat = focusCoordinates?.lat ?? center?.[0];
  const targetLng = focusCoordinates?.lng ?? center?.[1];
  const targetZoom = focusCoordinates?.zoom ?? zoom;

  useEffect(() => {
    if (targetLat && targetLng) {
      map.flyTo([targetLat, targetLng], targetZoom, { duration: 1.2 });
    }
  }, [targetLat, targetLng, targetZoom, map]);

  return null;
}

// Street-level zoom used when the user clicks a property on the map
const PROPERTY_FOCUS_ZOOM = 17;

// Exposes the Leaflet map instance to the parent and handles clicks on empty map areas
function MapBridge({ onReady, onMapClick }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  useMapEvents({
    click: (e) => onMapClick?.(e),
  });
  return null;
}

export default function MapView({ properties = [], userPosition, radarRadius, radarActive, focusCoordinates }) {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  const handleMapReady = useCallback((map) => { mapRef.current = map; }, []);

  /**
   * Fly to a property at street-level zoom. The map is centered slightly
   * below the marker so the popup (which opens above the pin) stays visible.
   */
  const focusProperty = useCallback((prop, lat, lng) => {
    const map = mapRef.current;
    if (!map) return;
    setSelectedProperty(prop);

    const zoom = Math.max(map.getZoom(), PROPERTY_FOCUS_ZOOM);
    const mapHeight = map.getSize().y;
    const verticalOffset = Math.min(140, mapHeight * 0.3);
    const markerPoint = map.project([lat, lng], zoom);
    const target = map.unproject(markerPoint.subtract([0, verticalOffset]), zoom);

    map.flyTo(target, zoom, { duration: 1.1 });
    map.once('moveend', () => {
      markerRefs.current[prop.id]?.openPopup();
    });
  }, []);
  const { isFavorite, toggleFavorite } = useFavorites();

  const userLocationIcon = useMemo(() => {
    return L.divIcon({
      html: `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-azul-ruta opacity-30 animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-azul-ruta border-2 border-white shadow-md"></div>
        </div>
      `,
      className: 'user-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  const isInsideGuatemala = (lat, lng) => lat >= 13.5 && lat <= 18.0 && lng >= -92.5 && lng <= -88.0;

  // Default center: Guatemala City
  const defaultCenter = useMemo(() => {
    if (userPosition?.lat && userPosition?.lng && isInsideGuatemala(userPosition.lat, userPosition.lng)) {
      return [userPosition.lat, userPosition.lng];
    }
    return [14.6349, -90.5069];
  }, [userPosition?.lat, userPosition?.lng]);

  const isUserInGt = Boolean(userPosition?.lat && userPosition?.lng && isInsideGuatemala(userPosition.lat, userPosition.lng));

  return (
    <div className="relative h-full w-full min-h-[320px] min-w-0">
      <MapContainer
        center={defaultCenter}
        zoom={isUserInGt ? 13 : 12}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[320px] z-0 rounded-2xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          center={defaultCenter}
          zoom={userPosition ? 13 : 11}
          focusCoordinates={focusCoordinates}
        />

        <MapBridge
          onReady={handleMapReady}
          onMapClick={() => {
            // On a single-property map (detail page), clicking anywhere zooms to the home
            if (properties.length !== 1) return;
            if ((mapRef.current?.getZoom() ?? 0) >= PROPERTY_FOCUS_ZOOM) return;
            const only = properties[0];
            const lat = Number(only.coordinates?.lat ?? only.location?.mapCoordinates?.lat);
            const lng = Number(only.coordinates?.lng ?? only.location?.mapCoordinates?.lng);
            if (!isNaN(lat) && !isNaN(lng)) focusProperty(only, lat, lng);
          }}
        />

        {/* User location marker & radar circle (solo dentro de Guatemala) */}
        {userPosition?.lat && userPosition?.lng && isInsideGuatemala(userPosition.lat, userPosition.lng) && (
          <>
            <Marker position={[userPosition.lat, userPosition.lng]} icon={userLocationIcon}>
              <Popup>
                <div className="p-2 text-center">
                  <p className="font-bold text-cafe">Tu ubicación</p>
                  <p className="text-xs text-text-muted">Punto de origen de búsqueda</p>
                </div>
              </Popup>
            </Marker>
            {radarRadius && (
              <Circle
                center={[userPosition.lat, userPosition.lng]}
                radius={radarRadius * 1000}
                pathOptions={{
                  color: '#168A55',
                  fillColor: '#168A55',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: radarActive ? '6, 6' : undefined,
                }}
              />
            )}
          </>
        )}

        {/* Property markers */}
        {properties.map((prop) => {
          if (!prop.coordinates && !prop.location?.mapCoordinates) return null;
          const propLat = Number(prop.coordinates?.lat ?? prop.location?.mapCoordinates?.lat);
          const propLng = Number(prop.coordinates?.lng ?? prop.location?.mapCoordinates?.lng);
          if (isNaN(propLat) || isNaN(propLng)) return null;

          const isSelected = selectedProperty?.id === prop.id;
          const dist = userPosition?.lat && userPosition?.lng
            ? calculateDistance(userPosition.lat, userPosition.lng, propLat, propLng)
            : null;

          const thumbnail = prop.thumbnail || (Array.isArray(prop.images) && prop.images[0]) || `${import.meta.env.BASE_URL}Casas/hero-banner-new.jpg`;
          const approxAddress = prop.address?.approximate || prop.location?.approximateAddress || prop.location?.zone || 'Ubicación no indicada';

          return (
            <Marker
              key={prop.id}
              ref={(ref) => { if (ref) markerRefs.current[prop.id] = ref; }}
              position={[propLat, propLng]}
              icon={createCustomIcon(prop.type, prop.price, isSelected)}
              eventHandlers={{
                click: () => focusProperty(prop, propLat, propLng),
              }}
            >
              <Popup autoPan={false}>
                <div className="max-w-full p-0" style={{ width: 'min(16rem, calc(100vw - 4rem))' }}>
                  <div className="relative aspect-video rounded-t-xl overflow-hidden bg-crema">
                    <img
                      src={thumbnail}
                      alt={prop.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(prop.id);
                      }}
                      className={`absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full ${
                        isFavorite(prop.id)
                          ? 'bg-terracota text-white'
                          : 'bg-white/80 text-cafe'
                      }`}
                    >
                      <Heart size={17} fill={isFavorite(prop.id) ? 'currentColor' : 'none'} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-white/95 px-2 py-0.5 rounded-lg text-xs font-extrabold text-forest">
                      {formatPrice(prop.price)}/mes
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm text-cafe line-clamp-1">{prop.title}</h4>
                    <p className="mt-0.5 break-words text-xs text-text-muted">{approxAddress}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Bed size={12} /> {prop.bedrooms || prop.features?.bedrooms || 1}</span>
                      <span className="flex items-center gap-1"><Bath size={12} /> {prop.bathrooms || prop.features?.bathrooms || 1}</span>
                      {dist !== null && (
                        <span className="ml-auto font-semibold text-azul-ruta">{formatDistance(dist)}</span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
                      <Link
                        to={`/propiedad/${prop.id}`}
                        className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg bg-terracota px-3 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-terracota-dark"
                      >
                        Ver detalle <ArrowRight size={12} />
                      </Link>
                      <Link
                        to={`/chat?property=${prop.id}`}
                        className="flex min-h-11 items-center justify-center rounded-lg bg-forest/10 px-3 py-2 text-xs font-bold text-forest transition-colors hover:bg-forest/20"
                      >
                        Contactar
                      </Link>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>
    </div>
  );
}
