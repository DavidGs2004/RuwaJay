import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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

const userLocationIcon = L.divIcon({
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

// Map recenter controller
function MapController({ center, zoom, focusCoordinates }) {
  const map = useMap();

  useEffect(() => {
    if (focusCoordinates?.lat && focusCoordinates?.lng) {
      map.flyTo(
        [focusCoordinates.lat, focusCoordinates.lng],
        focusCoordinates.zoom || 12,
        { duration: 1.3 }
      );
    } else if (center) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, focusCoordinates, map]);

  return null;
}

export default function MapView({ properties, userPosition, radarRadius, radarActive, focusCoordinates }) {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Default center: Guatemala City
  const defaultCenter = userPosition
    ? [userPosition.lat, userPosition.lng]
    : [14.6349, -90.5069];

  return (
    <div className="relative h-full w-full min-w-0">
      <MapContainer
        center={defaultCenter}
        zoom={userPosition ? 13 : 11}
        scrollWheelZoom={true}
        className="w-full h-full z-0 rounded-2xl"
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

        {/* User location marker & radar circle */}
        {userPosition && (
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
          const isSelected = selectedProperty?.id === prop.id;
          const dist = userPosition
            ? calculateDistance(
                userPosition.lat,
                userPosition.lng,
                prop.coordinates.lat,
                prop.coordinates.lng
              )
            : null;

          return (
            <Marker
              key={prop.id}
              position={[prop.coordinates.lat, prop.coordinates.lng]}
              icon={createCustomIcon(prop.type, prop.price, isSelected)}
              eventHandlers={{
                click: () => setSelectedProperty(prop),
              }}
            >
              <Popup>
                <div className="max-w-full p-0" style={{ width: 'min(16rem, calc(100vw - 4rem))' }}>
                  <div className="relative aspect-video rounded-t-xl overflow-hidden bg-crema">
                    <img
                      src={prop.thumbnail}
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
                    <p className="mt-0.5 break-words text-xs text-text-muted">{prop.address.approximate}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Bed size={12} /> {prop.bedrooms}</span>
                      <span className="flex items-center gap-1"><Bath size={12} /> {prop.bathrooms}</span>
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
